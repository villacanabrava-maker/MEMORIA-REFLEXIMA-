import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import { characterCount, MAX_CONTENT, MAX_TITLE, type SourceInput } from "@/lib/sources/validation";

export const MAX_PDF_PROCESS_BYTES = 8_000_000;
export const MAX_PDF_PAGES = 80;
export const PDF_PROCESS_TIMEOUT_MS = 10_000;
const MAX_PDF_IMAGE_PIXELS = 16_777_216;

type PdfTextResult =
  | { ok: true; value: SourceInput; pages: number }
  | { ok: false; code: "too_large" | "invalid" | "timeout"; message: string };

function timeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("PDF_TIMEOUT")), milliseconds);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export async function extractPdfText(name: string, bytes: Uint8Array): Promise<PdfTextResult> {
  if (bytes.byteLength < 5 || bytes.byteLength > MAX_PDF_PROCESS_BYTES) {
    return { ok: false, code: "too_large", message: "Para extrair texto de PDF, o arquivo precisa ter até 8 MB. O original continua preservado." };
  }
  if (new TextDecoder("ascii").decode(bytes.subarray(0, 5)) !== "%PDF-") {
    return { ok: false, code: "invalid", message: "O arquivo não possui uma assinatura PDF válida. O original não foi alterado." };
  }

  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | null = null;
  try {
    pdf = await timeout(getDocumentProxy(bytes, {
      maxImageSize: MAX_PDF_IMAGE_PIXELS,
    }), PDF_PROCESS_TIMEOUT_MS);

    if (pdf.numPages < 1) {
      return { ok: false, code: "invalid", message: "O PDF não possui páginas legíveis." };
    }
    if (pdf.numPages > MAX_PDF_PAGES) {
      return { ok: false, code: "too_large", message: `Para extração automática nesta etapa, o PDF pode ter até ${MAX_PDF_PAGES} páginas. O original continua preservado.` };
    }

    const extracted = await timeout(extractText(pdf, { mergePages: true }), PDF_PROCESS_TIMEOUT_MS);
    const content = extracted.text.replace(/\r\n?/g, "\n").trim();
    if (!content) {
      return { ok: false, code: "invalid", message: "Este PDF não contém texto selecionável. PDFs digitalizados por imagem precisarão da etapa futura de OCR." };
    }
    if (content.includes("\0") || characterCount(content) > MAX_CONTENT) {
      return { ok: false, code: "too_large", message: "O texto extraído ultrapassa 100.000 caracteres. O original continua preservado sem cortes." };
    }

    const stem = name.replace(/\.pdf$/i, "").trim();
    const title = Array.from(stem || "PDF importado").slice(0, MAX_TITLE).join("");
    return { ok: true, value: { title, content }, pages: extracted.totalPages };
  } catch (error) {
    if (error instanceof Error && error.message === "PDF_TIMEOUT") {
      return { ok: false, code: "timeout", message: "A leitura deste PDF ultrapassou o tempo seguro de processamento. O original continua preservado." };
    }
    return { ok: false, code: "invalid", message: "Não foi possível extrair texto deste PDF com segurança. O original continua preservado." };
  } finally {
    if (pdf) {
      try { await pdf.loadingTask.destroy(); } catch { /* O original não é afetado por falha ao liberar o parser. */ }
    }
  }
}
