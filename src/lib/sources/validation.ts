export const MAX_TITLE = 200;
export const MAX_CONTENT = 100_000;
export const PAGE_SIZE = 12;

export type SourceInput = { title: string; content: string };
export type FormState = {
  message: string;
  errors?: Partial<Record<keyof SourceInput, string>>;
};

export function characterCount(value: string): number {
  return Array.from(value).length;
}

export function validateSource(title: unknown, content: unknown):
  | { ok: true; value: SourceInput }
  | { ok: false; errors: NonNullable<FormState["errors"]> } {
  const errors: NonNullable<FormState["errors"]> = {};
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  if (!cleanTitle || characterCount(cleanTitle) > MAX_TITLE || cleanTitle.includes("\0")) {
    errors.title = "Informe um título de 1 a 200 caracteres, sem caracteres nulos.";
  }
  if (typeof content !== "string" || !content.trim() || characterCount(content) > MAX_CONTENT || content.includes("\0")) {
    errors.content = "Informe um texto de 1 a 100.000 caracteres, sem caracteres nulos.";
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  // Preserve the text exactly as submitted, including leading/trailing whitespace.
  return { ok: true, value: { title: cleanTitle, content: content as string } };
}

export function isSourceId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isVersion(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}

export function parsePage(value: unknown): number {
  if (typeof value !== "string" || !/^\d{1,6}$/.test(value)) return 1;
  const page = Number(value);
  return page >= 1 && page <= 100_000 ? page : 1;
}

export function searchTerm(value: unknown): string {
  return typeof value === "string" ? Array.from(value.replace(/\0/g, "").trim()).slice(0, 100).join("") : "";
}

export function titlePattern(value: string): string {
  // Escape SQL LIKE wildcards; do not interpolate into a PostgREST .or() filter.
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

export function libraryUrl(query = "", page = 1): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("pagina", String(page));
  const suffix = params.toString();
  return `/biblioteca${suffix ? `?${suffix}` : ""}`;
}

export const MAX_IMPORT_BYTES = MAX_CONTENT * 4;
export type TextImportResult =
  | { ok: true; value: SourceInput; normalizedLineEndings: boolean; removedBom: boolean }
  | { ok: false; message: string };

export function validateTextFile(name: unknown, size: unknown): { ok: true } | { ok: false; message: string } {
  if (typeof name !== "string" || characterCount(name) > 255 || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069/\\]/.test(name) || !/^.+\.(txt|md)$/i.test(name)) {
    return { ok: false, message: "Escolha um arquivo .txt ou .md com nome válido." };
  }
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 1 || size > MAX_IMPORT_BYTES) {
    return { ok: false, message: "O arquivo deve ter conteúdo e até 400 KB (400.000 bytes)." };
  }
  return { ok: true };
}

// Decode only local UTF-8 text. Never evaluate markup or silently truncate content.
// Browser textareas standardize newlines, so this conversion is explicit here.
export function decodeTextFile(name: string, bytes: Uint8Array): TextImportResult {
  const metadata = validateTextFile(name, bytes.byteLength);
  if (!metadata.ok) return metadata;
  let decoded: string;
  try { decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { return { ok: false, message: "Salve o arquivo como texto UTF-8 antes de importar." }; }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(decoded)) {
    return { ok: false, message: "O arquivo contém dados binários ou caracteres de controle incompatíveis." };
  }
  const content = decoded.replace(/\r\n?/g, "\n");
  if (!content.trim()) return { ok: false, message: "O arquivo não contém texto para importar." };
  if (characterCount(content) > MAX_CONTENT) return { ok: false, message: "O texto ultrapassa 100.000 caracteres. Divida o arquivo antes de importar; nenhum trecho foi cortado." };
  const stem = name.replace(/\.(txt|md)$/i, "").trim();
  const title = Array.from(stem || "Texto importado").slice(0, MAX_TITLE).join("");
  return { ok: true, value: { title, content }, normalizedLineEndings: decoded.includes("\r"), removedBom: bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf };
}
