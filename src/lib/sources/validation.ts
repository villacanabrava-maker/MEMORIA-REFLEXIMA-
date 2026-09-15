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
