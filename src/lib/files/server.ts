import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { decodeTextFile, MAX_IMPORT_BYTES, type SourceInput } from "@/lib/sources/validation";
import { extractDocxText, MAX_DOCX_PROCESS_BYTES } from "./docx";
import { FILE_BUCKET, FILE_PAGE_SIZE, parseFileKey } from "./validation";

export function filesEnabled(): boolean {
  const configured = process.env.PRIVATE_FILES_ENABLED;
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.VERCEL_ENV === "preview";
}

export function privateJson(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" } });
}

export async function fileApiAccess() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { ok: false as const, response: privateJson({ message: "Entre novamente para acessar seus arquivos." }, 401) };
    if (!filesEnabled()) return { ok: false as const, response: privateJson({ message: "O armazenamento de arquivos ainda não foi ativado neste ambiente." }, 503) };
    return { ok: true as const, supabase, user: data.user };
  } catch {
    return { ok: false as const, response: privateJson({ message: "Não foi possível validar o acesso aos arquivos." }, 503) };
  }
}

export type LibraryFile = { key: string; name: string; size: number | null; createdAt: string | null };
export type FilesResult = { status: "ready"; files: LibraryFile[]; hasNext: boolean; unknownFiles: boolean } | { status: "disabled" | "error" };

function toLibraryFile(item: { name: string; id?: string | null; metadata?: Record<string, unknown> | null; created_at?: string | null }): LibraryFile | null {
  const parsed = parseFileKey(item.name);
  if (!parsed || !item.id) return null;
  return { key: item.name, name: parsed.originalName, size: typeof item.metadata?.size === "number" ? item.metadata.size : null, createdAt: item.created_at ?? null };
}

export async function getFiles(page: number): Promise<FilesResult> {
  const { supabase, user } = await requireUser();
  if (!filesEnabled()) return { status: "disabled" };
  try {
    const { data, error } = await supabase.storage.from(FILE_BUCKET).list(user.id, { limit: FILE_PAGE_SIZE + 1, offset: (page - 1) * FILE_PAGE_SIZE, sortBy: { column: "created_at", order: "desc" } });
    if (error || !data) return { status: "error" };
    let unknownFiles = false; const files: LibraryFile[] = [];
    for (const item of data.slice(0, FILE_PAGE_SIZE)) { const file = toLibraryFile(item); if (!file) unknownFiles = true; else files.push(file); }
    return { status: "ready", files, hasNext: data.length > FILE_PAGE_SIZE, unknownFiles };
  } catch { return { status: "error" }; }
}

export type FileResult = { status: "ready"; file: LibraryFile } | { status: "disabled" | "missing" | "invalid" | "error" };

export async function getFile(key: string): Promise<FileResult> {
  if (!parseFileKey(key)) return { status: "invalid" };
  const { supabase, user } = await requireUser();
  if (!filesEnabled()) return { status: "disabled" };
  try {
    const { data, error } = await supabase.storage.from(FILE_BUCKET).list(user.id, { limit: 10, search: key });
    if (error || !data) return { status: "error" };
    const exact = data.find((item) => item.name === key && item.id);
    if (!exact) return { status: "missing" };
    const file = toLibraryFile(exact);
    return file ? { status: "ready", file } : { status: "invalid" };
  } catch { return { status: "error" }; }
}

export type FileProcessingStatus = "not_started" | "pending" | "queued" | "processing" | "completed" | "needs_ocr" | "needs_transcription" | "preserved" | "error";
export type FileProcessingState = {
  status: FileProcessingStatus;
  strategy: string | null;
  totalPages: number | null;
  processedPages: number;
  processedBytes: number;
  fileSize: number | null;
  lastError: string | null;
  pagePreview: Array<{ pageNumber: number; content: string }>;
  chunkPreview: Array<{ chunkIndex: number; label: string | null; content: string }>;
  hasMorePreview: boolean;
};

const EMPTY_PROCESSING: FileProcessingState = { status: "not_started", strategy: null, totalPages: null, processedPages: 0, processedBytes: 0, fileSize: null, lastError: null, pagePreview: [], chunkPreview: [], hasMorePreview: false };

export async function ensureFileProcessing(key: string, file: LibraryFile): Promise<void> {
  const parsed = parseFileKey(key); if (!parsed) return;
  const { supabase } = await requireUser();
  await supabase.rpc("enqueue_library_file_processing", { p_storage_key: key, p_file_name: file.name, p_mime_type: null, p_file_size: file.size, p_force: false });
}

export async function getFileProcessingState(key: string): Promise<FileProcessingState> {
  const parsed = parseFileKey(key); if (!parsed) return EMPTY_PROCESSING;
  const { supabase, user } = await requireUser();
  const { data: document, error } = await supabase.from("library_documents")
    .select("id,status,total_pages,processed_pages,processed_bytes,file_size,processor_strategy,last_error")
    .eq("user_id", user.id).eq("storage_key", key).maybeSingle();
  if (error || !document) return EMPTY_PROCESSING;

  const isPdf = /\.pdf$/i.test(parsed.originalName);
  if (isPdf) {
    const { data: pages } = await supabase.from("library_document_pages").select("page_number,content").eq("document_id", document.id).order("page_number", { ascending: true }).limit(13);
    const preview = pages ?? [];
    return { status: document.status as FileProcessingStatus, strategy: document.processor_strategy, totalPages: document.total_pages, processedPages: document.processed_pages ?? 0, processedBytes: Number(document.processed_bytes ?? 0), fileSize: document.file_size === null ? null : Number(document.file_size), lastError: document.last_error, pagePreview: preview.slice(0, 12).map((p) => ({ pageNumber: p.page_number, content: p.content })), chunkPreview: [], hasMorePreview: preview.length > 12 };
  }

  const { data: chunks } = await supabase.from("library_document_chunks").select("chunk_index,label,content").eq("document_id", document.id).order("chunk_index", { ascending: true }).limit(13);
  const preview = chunks ?? [];
  return { status: document.status as FileProcessingStatus, strategy: document.processor_strategy, totalPages: document.total_pages, processedPages: document.processed_pages ?? 0, processedBytes: Number(document.processed_bytes ?? 0), fileSize: document.file_size === null ? null : Number(document.file_size), lastError: document.last_error, pagePreview: [], chunkPreview: preview.slice(0, 12).map((c) => ({ chunkIndex: c.chunk_index, label: c.label, content: c.content })), hasMorePreview: preview.length > 12 };
}

export type TextExtractionResult = { status: "ready"; input: SourceInput; normalizedLineEndings: boolean; removedBom: boolean; format: "text" | "docx" } | { status: "unsupported" | "too_large" | "invalid" | "missing" | "error"; message: string };

export async function extractStoredText(key: string): Promise<TextExtractionResult> {
  const parsed = parseFileKey(key); if (!parsed) return { status: "invalid", message: "O identificador deste arquivo é inválido." };
  const isText = /\.(txt|md)$/i.test(parsed.originalName); const isDocx = /\.docx$/i.test(parsed.originalName);
  if (!isText && !isDocx) return { status: "unsupported", message: "Este formato usa a fila universal de processamento; o original continua preservado." };
  const { supabase, user } = await requireUser(); if (!filesEnabled()) return { status: "error", message: "O armazenamento de arquivos ainda não está ativo neste ambiente." };
  const path = `${user.id}/${key}`;
  try {
    const { data: listed, error: listError } = await supabase.storage.from(FILE_BUCKET).list(user.id, { limit: 10, search: key });
    if (listError || !listed) return { status: "error", message: "Não foi possível verificar o arquivo antes da leitura." };
    const exact = listed.find((item) => item.name === key && item.id); if (!exact) return { status: "missing", message: "Este arquivo não foi encontrado na sua área privada." };
    const listedSize = typeof exact.metadata?.size === "number" ? exact.metadata.size : null; const processLimit = isDocx ? MAX_DOCX_PROCESS_BYTES : MAX_IMPORT_BYTES;
    if (listedSize !== null && listedSize > processLimit) return { status: "too_large", message: "O arquivo ultrapassa o limite de leitura direta. O processamento em segundo plano continua preservando o original." };
    const { data, error } = await supabase.storage.from(FILE_BUCKET).download(path); if (error || !data) return { status: "error", message: "Não foi possível ler este arquivo agora." };
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (isDocx) { const extracted = extractDocxText(parsed.originalName, bytes); if (!extracted.ok) return { status: extracted.code === "too_large" ? "too_large" : "invalid", message: extracted.message }; return { status: "ready", input: extracted.value, normalizedLineEndings: false, removedBom: false, format: "docx" }; }
    const decoded = decodeTextFile(parsed.originalName, bytes); if (!decoded.ok) return { status: "invalid", message: decoded.message };
    return { status: "ready", input: decoded.value, normalizedLineEndings: decoded.normalizedLineEndings, removedBom: decoded.removedBom, format: "text" };
  } catch { return { status: "error", message: "A conexão foi interrompida durante a leitura. Nenhum texto foi alterado." }; }
}
