import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getResolvedPDFJS } from "npm:unpdf@1.8.1";
import * as mammothImport from "npm:mammoth@1.12.3";
import { unzipSync } from "npm:fflate@0.8.2";
import { Buffer } from "node:buffer";

const BUCKET = "library-originals-v1";
const PDF_BATCH = 6;
const MAX_OFFICE_BYTES = 15_000_000;
const MAX_TEXT_BYTES = 20_000_000;
const CHUNK_CHARS = 20_000;
const url = Deno.env.get("SUPABASE_URL")!;
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? (() => {
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default as string | undefined; }
  catch { return undefined; }
})();
if (!url || !serviceRole) throw new Error("Supabase worker credentials unavailable");
const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

type QueueMessage = { document_id: string; user_id: string; storage_key: string; file_name: string; mime_type?: string | null; file_size?: number | null };
type Claimed = { msg_id: number | string; read_ct: number; message: QueueMessage };

function extension(name: string) { const index = name.lastIndexOf("."); return index >= 0 ? name.slice(index + 1).toLowerCase() : ""; }
function classify(name: string, mime?: string | null) {
  const ext = extension(name);
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (ext === "docx" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (ext === "odt" || mime === "application/vnd.oasis.opendocument.text") return "odt";
  if (ext === "rtf" || mime === "application/rtf" || mime === "text/rtf") return "rtf";
  if (new Set(["txt","md","markdown","csv","tsv","json","xml","html","htm","yaml","yml","log","ini","toml"]).has(ext) || mime?.startsWith("text/")) return "text";
  if (new Set(["png","jpg","jpeg","webp","gif","bmp","tif","tiff","heic","heif","avif"]).has(ext) || mime?.startsWith("image/")) return "needs_ocr";
  if (new Set(["mp3","wav","m4a","aac","ogg","flac","opus","mp4","mov","mkv","webm","avi","m4v","mpeg","mpg"]).has(ext) || mime?.startsWith("audio/") || mime?.startsWith("video/")) return "needs_transcription";
  return "preserve";
}
function chunks(text: string) { const values: string[] = []; for (let i = 0; i < text.length; i += CHUNK_CHARS) values.push(text.slice(i, i + CHUNK_CHARS)); return values; }
function normalizeText(text: string) { return text.replace(/\r\n?/g, "\n").replace(/\u0000/g, "").trim(); }
function decodeXmlEntities(value: string) {
  return value.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (entity) => {
    if (entity === "&amp;") return "&"; if (entity === "&lt;") return "<"; if (entity === "&gt;") return ">"; if (entity === "&quot;") return '"'; if (entity === "&apos;") return "'";
    const hex = /^&#x([0-9a-f]+);$/i.exec(entity); const dec = /^&#(\d+);$/.exec(entity); const code = hex ? parseInt(hex[1],16) : dec ? parseInt(dec[1],10) : -1;
    return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "�";
  });
}
function odtToText(bytes: Uint8Array) {
  const files = unzipSync(bytes); const xmlBytes = files["content.xml"]; if (!xmlBytes) throw new Error("ODT_CONTENT_MISSING");
  const xml = new TextDecoder("utf-8", { fatal: true }).decode(xmlBytes);
  return normalizeText(decodeXmlEntities(xml.replace(/<text:tab\b[^>]*\/>/gi, "\t").replace(/<text:line-break\b[^>]*\/>/gi, "\n").replace(/<\/text:p>/gi, "\n").replace(/<\/text:h>/gi, "\n").replace(/<[^>]+>/g, "")));
}
function rtfToText(input: string) {
  const hexDecoded = input.replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return normalizeText(hexDecoded.replace(/\\par[d]?\b ?/gi, "\n").replace(/\\tab\b ?/gi, "\t").replace(/\\[{}\\]/g, (m) => m.slice(1)).replace(/\\[a-z]+-?\d* ?/gi, "").replace(/[{}]/g, ""));
}
async function updateDocument(message: QueueMessage, patch: Record<string, unknown>) {
  const { error } = await admin.from("library_documents").update(patch).eq("id", message.document_id).eq("user_id", message.user_id); if (error) throw error;
}
async function saveChunks(message: QueueMessage, text: string, metadata: Record<string, unknown> = {}) {
  const parts = chunks(text); if (!parts.length) return 0;
  const rows = parts.map((content, chunk_index) => ({ document_id: message.document_id, user_id: message.user_id, chunk_index, label: `Parte ${chunk_index + 1}`, content, character_count: Array.from(content).length, metadata }));
  const { error } = await admin.from("library_document_chunks").upsert(rows, { onConflict: "document_id,chunk_index" }); if (error) throw error; return parts.length;
}
async function downloadOriginal(message: QueueMessage) {
  const { data, error } = await admin.storage.from(BUCKET).download(`${message.user_id}/${message.storage_key}`); if (error || !data) throw error ?? new Error("FILE_DOWNLOAD_FAILED"); return data;
}
async function processText(message: QueueMessage) {
  const blob = await downloadOriginal(message);
  if (blob.size > MAX_TEXT_BYTES) { await updateDocument(message, { status: "preserved", processor_strategy: "text_preserved_large", last_error: "Arquivo textual acima do limite de processamento automático; original preservado.", completed_at: new Date().toISOString() }); return; }
  const text = normalizeText(new TextDecoder("utf-8", { fatal: false }).decode(await blob.arrayBuffer())); if (text) await saveChunks(message, text, { format: "text" });
  await updateDocument(message, { status: "completed", processor_strategy: "text", processed_bytes: blob.size, completed_at: new Date().toISOString(), last_error: null });
}
async function processDocx(message: QueueMessage) {
  const blob = await downloadOriginal(message);
  if (blob.size > MAX_OFFICE_BYTES) { await updateDocument(message, { status: "preserved", processor_strategy: "docx_preserved_large", last_error: "DOCX grande demais para extração automática nesta etapa; original preservado.", completed_at: new Date().toISOString() }); return; }
  const mammoth: any = (mammothImport as any).default ?? mammothImport; const arrayBuffer = await blob.arrayBuffer(); const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
  const text = normalizeText(result.value ?? ""); if (text) await saveChunks(message, text, { format: "docx" });
  await updateDocument(message, { status: "completed", processor_strategy: "docx", processed_bytes: blob.size, completed_at: new Date().toISOString(), last_error: result.messages?.length ? "Documento lido com avisos de conversão." : null });
}
async function processOdt(message: QueueMessage) {
  const blob = await downloadOriginal(message);
  if (blob.size > MAX_OFFICE_BYTES) { await updateDocument(message, { status: "preserved", processor_strategy: "odt_preserved_large", last_error: "ODT grande demais para extração automática nesta etapa; original preservado.", completed_at: new Date().toISOString() }); return; }
  const text = odtToText(new Uint8Array(await blob.arrayBuffer())); if (text) await saveChunks(message, text, { format: "odt" });
  await updateDocument(message, { status: "completed", processor_strategy: "odt", processed_bytes: blob.size, completed_at: new Date().toISOString(), last_error: null });
}
async function processRtf(message: QueueMessage) {
  const blob = await downloadOriginal(message);
  if (blob.size > 8_000_000) { await updateDocument(message, { status: "preserved", processor_strategy: "rtf_preserved_large", last_error: "RTF grande demais para extração automática nesta etapa; original preservado.", completed_at: new Date().toISOString() }); return; }
  const text = rtfToText(new TextDecoder("latin1").decode(await blob.arrayBuffer())); if (text) await saveChunks(message, text, { format: "rtf", extraction: "basic" });
  await updateDocument(message, { status: "completed", processor_strategy: "rtf", processed_bytes: blob.size, completed_at: new Date().toISOString(), last_error: null });
}
function pageText(items: Array<{ str?: string; hasEOL?: boolean }>) { return normalizeText(items.filter((x) => typeof x.str === "string").map((x) => `${x.str ?? ""}${x.hasEOL ? "\n" : ""}`).join("")); }
async function processPdf(message: QueueMessage) {
  const { data: doc, error: docError } = await admin.from("library_documents").select("processed_pages,pages_with_text,pages_without_text").eq("id", message.document_id).eq("user_id", message.user_id).single();
  if (docError || !doc) throw docError ?? new Error("DOCUMENT_STATE_MISSING");

  // Não usa range requests da URL assinada. Alguns PDFs/servidores podem produzir
  // offsets inconsistentes; entregar os bytes completos ao PDF.js torna o parsing
  // determinístico e o progresso continua persistido por lotes de páginas.
  const blob = await downloadOriginal(message);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length < 5 || String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") throw new Error("PDF_INVALID_HEADER");

  const pdfjs = await getResolvedPDFJS();
  const loadingTask = pdfjs.getDocument({ data: bytes, disableFontFace: true, useSystemFonts: true, maxImageSize: 16_777_216 });
  const pdf = await loadingTask.promise;
  try {
    const alreadyProcessed = Math.max(0, Number(doc.processed_pages ?? 0));
    if (alreadyProcessed >= pdf.numPages) {
      const totalWithText = Number(doc.pages_with_text ?? 0);
      await updateDocument(message, { status: totalWithText === 0 ? "needs_ocr" : "completed", processor_strategy: "pdf_pages", total_pages: pdf.numPages, processed_pages: pdf.numPages, processed_bytes: blob.size, completed_at: new Date().toISOString(), last_error: totalWithText === 0 ? "PDF composto por imagens ou sem texto selecionável; OCR necessário." : null });
      return { needsMore: false };
    }
    const start = alreadyProcessed + 1;
    const end = Math.min(pdf.numPages, start + PDF_BATCH - 1);
    let withText = 0; let withoutText = 0;
    const rows: Array<Record<string, unknown>> = [];
    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      try {
        const textContent = await page.getTextContent();
        const content = pageText(textContent.items as Array<{ str?: string; hasEOL?: boolean }>);
        if (content) withText += 1; else withoutText += 1;
        rows.push({ document_id: message.document_id, user_id: message.user_id, page_number: pageNumber, content, character_count: Array.from(content).length });
      } finally { page.cleanup(); }
    }
    if (rows.length) { const { error } = await admin.from("library_document_pages").upsert(rows, { onConflict: "document_id,page_number" }); if (error) throw error; }
    const processedPages = end;
    const totalWithText = Number(doc.pages_with_text ?? 0) + withText;
    const totalWithoutText = Number(doc.pages_without_text ?? 0) + withoutText;
    const done = processedPages >= pdf.numPages;
    await updateDocument(message, { status: done ? (totalWithText === 0 ? "needs_ocr" : "completed") : "processing", processor_strategy: "pdf_pages", total_pages: pdf.numPages, processed_pages: processedPages, pages_with_text: totalWithText, pages_without_text: totalWithoutText, processed_bytes: blob.size, completed_at: done ? new Date().toISOString() : null, last_error: done && totalWithText === 0 ? "PDF composto por imagens ou sem texto selecionável; OCR necessário." : null });
    return { needsMore: !done };
  } finally { try { await loadingTask.destroy(); } catch {} }
}
async function requeue(message: QueueMessage) { const { error } = await admin.rpc("worker_requeue_library_processing", { p_message: message, p_delay_seconds: 1 }); if (error) throw error; }
async function complete(msgId: number | string) { const { error } = await admin.rpc("worker_complete_library_processing", { p_msg_id: msgId }); if (error) throw error; }
async function processClaim(claim: Claimed) {
  const message = claim.message;
  if (!message?.document_id || !message?.user_id || !message?.storage_key || !message?.file_name) throw new Error("INVALID_QUEUE_MESSAGE");
  const strategy = classify(message.file_name, message.mime_type);
  await updateDocument(message, { status: "processing", processor_strategy: strategy, last_error: null });
  if (strategy === "pdf") { const result = await processPdf(message); if (result.needsMore) await requeue(message); }
  else if (strategy === "text") await processText(message);
  else if (strategy === "docx") await processDocx(message);
  else if (strategy === "odt") await processOdt(message);
  else if (strategy === "rtf") await processRtf(message);
  else if (strategy === "needs_ocr") await updateDocument(message, { status: "needs_ocr", processor_strategy: "ocr_pending", completed_at: new Date().toISOString(), last_error: "Imagem preservada; OCR será executado quando o processador OCR estiver habilitado." });
  else if (strategy === "needs_transcription") await updateDocument(message, { status: "needs_transcription", processor_strategy: "transcription_pending", completed_at: new Date().toISOString(), last_error: "Áudio/vídeo preservado; transcrição será executada quando o processador de mídia estiver habilitado." });
  else await updateDocument(message, { status: "preserved", processor_strategy: "preserve", completed_at: new Date().toISOString(), last_error: "Formato preservado com segurança; não há extrator automático habilitado para este tipo." });
  await complete(claim.msg_id);
}
Deno.serve(async (req: Request) => {
  const token = req.headers.get("x-library-worker-token") ?? "";
  const { data: valid, error: verifyError } = await admin.rpc("verify_library_worker_token", { p_token: token });
  if (verifyError || valid !== true) return new Response("Unauthorized", { status: 401 });
  const { data, error } = await admin.rpc("worker_claim_library_processing", { p_visibility_seconds: 150 });
  if (error) return Response.json({ ok: false, error: "queue_claim_failed" }, { status: 500 });
  const claim = (Array.isArray(data) ? data[0] : null) as Claimed | undefined;
  if (!claim) return Response.json({ ok: true, processed: 0 });
  try { await processClaim(claim); return Response.json({ ok: true, processed: 1 }); }
  catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "unknown processing error";
    const q = claim.message;
    if (q?.document_id && q?.user_id) {
      await updateDocument(q, { status: "error", last_error: message }).catch(() => undefined);
      if (Number(claim.read_ct ?? 0) >= 3) await complete(claim.msg_id).catch(() => undefined);
    }
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
});
