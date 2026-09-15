export const FILE_BUCKET = "library-originals-v1";
export const MAX_FILE_BYTES = 2_000_000;
export const FILE_PAGE_SIZE = 12;

const supportedTypes: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
};

export type FileValidation =
  | { ok: true; contentType: string }
  | { ok: false; message: string };

export function validateFileMetadata(name: unknown, size: unknown): FileValidation {
  if (
    typeof name !== "string" ||
    !name.trim() ||
    /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069/\\]/.test(name) ||
    new TextEncoder().encode(name).length > 150
  ) {
    return { ok: false, message: "Use um nome de arquivo curto, sem barras ou caracteres de controle." };
  }
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  const contentType = Object.hasOwn(supportedTypes, extension) ? supportedTypes[extension] : undefined;
  if (!contentType) return { ok: false, message: "Envie um arquivo PDF, TXT ou Markdown (.md)." };
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 1 || size > MAX_FILE_BYTES) {
    return { ok: false, message: "O arquivo precisa ter conteúdo e no máximo 2 MB." };
  }
  return { ok: true, contentType };
}

export function validateFileBytes(name: string, bytes: Uint8Array): FileValidation {
  const metadata = validateFileMetadata(name, bytes.byteLength);
  if (!metadata.ok) return metadata;
  if (metadata.contentType === "application/pdf") {
    const signature = String.fromCharCode(...bytes.slice(0, 5));
    if (signature !== "%PDF-") return { ok: false, message: "O arquivo não contém o cabeçalho esperado de um PDF." };
    return metadata;
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!text.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
      return { ok: false, message: "O texto está vazio ou contém dados binários. Use UTF-8." };
    }
  } catch {
    return { ok: false, message: "Salve o texto na codificação UTF-8 antes de enviar." };
  }
  return metadata;
}

export function isUploadId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function encodeName(name: string): string {
  const bytes = new TextEncoder().encode(name);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeName(value: string): string | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export async function fileDigest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join("");
}

export function buildFileKey(requestId: string, digest: string, name: string): string {
  if (!isUploadId(requestId) || !/^[0-9a-f]{64}$/.test(digest) || !validateFileMetadata(name, 1).ok) {
    throw new Error("Invalid file key input");
  }
  return `${requestId}--${digest}--${encodeName(name)}`;
}

export function parseFileKey(value: unknown): { requestId: string; digest: string; originalName: string } | null {
  if (typeof value !== "string" || value.length > 310) return null;
  const match = /^([0-9a-f-]{36})--([0-9a-f]{64})--([A-Za-z0-9_-]{1,200})$/i.exec(value);
  if (!match || !isUploadId(match[1])) return null;
  const originalName = decodeName(match[3]);
  if (!originalName || !validateFileMetadata(originalName, 1).ok || encodeName(originalName) !== match[3]) return null;
  return { requestId: match[1], digest: match[2].toLowerCase(), originalName };
}

export function attachmentHeader(name: string): string {
  if (!validateFileMetadata(name, 1).ok) throw new Error("Invalid attachment name");
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="original"; filename*=UTF-8''${encoded}`;
}

export function formatFileSize(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} KB`
    : "Tamanho indisponível";
}
