export const FILE_BUCKET = "library-originals-v1";
export const MAX_FILE_BYTES = 50_000_000;
export const FILE_PAGE_SIZE = 12;
export const TUS_CHUNK_BYTES = 6 * 1024 * 1024;

const knownTypes: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
  rtf: "application/rtf",
  pages: "application/vnd.apple.pages",
};
export type FileValidation = { ok: true; contentType: string } | { ok: false; message: string };

export function validateFileMetadata(name: unknown, size: unknown): FileValidation {
  if (typeof name !== "string" || !name.trim() || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069/\\]/.test(name) || new TextEncoder().encode(name).length > 150) {
    return { ok: false, message: "Use um nome de arquivo curto, sem barras ou caracteres de controle." };
  }
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 1 || size > MAX_FILE_BYTES) {
    return { ok: false, message: "O arquivo precisa ter conteúdo e no máximo 50 MB." };
  }
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  return { ok: true, contentType: knownTypes[extension] ?? "application/octet-stream" };
}

export function isUploadId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function encodeName(name: string): string {
  const bytes = new TextEncoder().encode(name); let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeName(value: string): string | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded); const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch { return null; }
}

export function buildFileKey(requestId: string, name: string): string {
  if (!isUploadId(requestId) || !validateFileMetadata(name, 1).ok) throw new Error("Invalid file key input");
  return `${requestId}--${encodeName(name)}`;
}
export function parseFileKey(value: unknown): { requestId: string; originalName: string } | null {
  if (typeof value !== "string" || value.length > 250) return null;
  const match = /^([0-9a-f-]{36})--([A-Za-z0-9_-]{1,200})$/i.exec(value);
  if (!match || !isUploadId(match[1])) return null;
  const originalName = decodeName(match[2]);
  if (!originalName || !validateFileMetadata(originalName, 1).ok || encodeName(originalName) !== match[2]) return null;
  return { requestId: match[1], originalName };
}
export function formatFileSize(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "Tamanho indisponível";
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
  return `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} KB`;
}
