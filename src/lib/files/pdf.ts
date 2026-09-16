import "server-only";
import { getResolvedPDFJS } from "unpdf";

export const PDF_BATCH_SIZE = 8;
export const PDF_BATCH_TIMEOUT_MS = 20_000;
export const MAX_PDF_PAGE_CHARACTERS = 120_000;
const MAX_PDF_IMAGE_PIXELS = 16_777_216;
const PDF_RANGE_CHUNK_BYTES = 65_536;

export type PdfPageText = {
  pageNumber: number;
  content: string;
  characterCount: number;
};

export type PdfBatchResult = {
  totalPages: number;
  startPage: number;
  endPage: number;
  pages: PdfPageText[];
};

function timeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("PDF_TIMEOUT")), milliseconds);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

function normalizePageText(items: Array<{ str?: string; hasEOL?: boolean }>): string {
  return items
    .filter((item) => typeof item.str === "string")
    .map((item) => `${item.str ?? ""}${item.hasEOL ? "\n" : ""}`)
    .join("")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractPdfBatchFromUrl(
  signedUrl: string,
  requestedStartPage: number,
  batchSize = PDF_BATCH_SIZE,
): Promise<PdfBatchResult> {
  const pdfjs = await getResolvedPDFJS();
  const loadingTask = pdfjs.getDocument({
    url: signedUrl,
    disableFontFace: true,
    useSystemFonts: true,
    maxImageSize: MAX_PDF_IMAGE_PIXELS,
    rangeChunkSize: PDF_RANGE_CHUNK_BYTES,
  });

  const pdf = await timeout(loadingTask.promise, PDF_BATCH_TIMEOUT_MS);
  try {
    if (!Number.isSafeInteger(pdf.numPages) || pdf.numPages < 1) throw new Error("PDF_INVALID");
    const startPage = Math.max(1, Math.min(requestedStartPage, pdf.numPages));
    const safeBatch = Math.max(1, Math.min(batchSize, PDF_BATCH_SIZE));
    const endPage = Math.min(pdf.numPages, startPage + safeBatch - 1);
    const pages: PdfPageText[] = [];

    for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
      const page = await timeout(pdf.getPage(pageNumber), PDF_BATCH_TIMEOUT_MS);
      const content = await timeout(page.getTextContent(), PDF_BATCH_TIMEOUT_MS);
      const text = normalizePageText(content.items as Array<{ str?: string; hasEOL?: boolean }>);
      const characterCount = Array.from(text).length;
      if (characterCount > MAX_PDF_PAGE_CHARACTERS) throw new Error("PDF_PAGE_TOO_LARGE");
      pages.push({ pageNumber, content: text, characterCount });
      page.cleanup();
    }

    return { totalPages: pdf.numPages, startPage, endPage, pages };
  } finally {
    try { await loadingTask.destroy(); } catch { /* liberar o parser nao altera o original */ }
  }
}
