export const CATALOG_TITLE_MAX = 300;
export const CATALOG_AUTHOR_MAX = 200;
export const CATALOG_SHORT_MAX = 120;
export const CATALOG_DESCRIPTION_MAX = 2000;

export const CATALOG_KIND_OPTIONS = [
  ["book", "Livro"],
  ["letter", "Carta"],
  ["reflection", "Reflexão"],
  ["report", "Relatório"],
  ["note", "Nota"],
  ["message", "Mensagem"],
  ["work_material", "Material de trabalho"],
  ["document", "Documento"],
  ["text", "Texto"],
  ["other", "Outro"],
] as const;

export const CATALOG_AUTHORSHIP_OPTIONS = [
  ["unknown", "Ainda não sei / não revisei"],
  ["user", "Escrito por mim"],
  ["external", "Conteúdo de outra pessoa"],
  ["mixed", "Autoria mista"],
  ["ai", "Gerado principalmente por IA"],
] as const;

export type CatalogKindValue = (typeof CATALOG_KIND_OPTIONS)[number][0];
export type CatalogAuthorshipValue = (typeof CATALOG_AUTHORSHIP_OPTIONS)[number][0];

export type CatalogMetadataInput = {
  title: string;
  kind: CatalogKindValue;
  authorship: CatalogAuthorshipValue;
  author_name: string | null;
  published_year: number | null;
  category: string | null;
  theme: string | null;
  description: string | null;
  retrieval_enabled: boolean;
};

export type CatalogMetadataErrors = Partial<Record<"title" | "kind" | "authorship" | "author_name" | "published_year" | "category" | "theme" | "description", string>>;
export type CatalogMetadataFormState = { message: string; errors?: CatalogMetadataErrors };

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function optional(value: FormDataEntryValue | null, max: number, field: keyof CatalogMetadataErrors, errors: CatalogMetadataErrors): string | null {
  const normalized = text(value);
  if (!normalized) return null;
  if (Array.from(normalized).length > max) errors[field] = `Use no máximo ${max.toLocaleString("pt-BR")} caracteres.`;
  return normalized;
}

export function validateCatalogMetadata(formData: FormData): { ok: true; value: CatalogMetadataInput } | { ok: false; errors: CatalogMetadataErrors } {
  const errors: CatalogMetadataErrors = {};
  const title = text(formData.get("title"));
  if (!title) errors.title = "Dê um título para encontrar este item depois.";
  else if (Array.from(title).length > CATALOG_TITLE_MAX) errors.title = `Use no máximo ${CATALOG_TITLE_MAX} caracteres.`;

  const kind = text(formData.get("kind"));
  const allowedKinds = CATALOG_KIND_OPTIONS.map(([value]) => value) as readonly string[];
  if (!allowedKinds.includes(kind)) errors.kind = "Escolha um tipo de conteúdo válido.";

  const authorship = text(formData.get("authorship"));
  const allowedAuthorship = CATALOG_AUTHORSHIP_OPTIONS.map(([value]) => value) as readonly string[];
  if (!allowedAuthorship.includes(authorship)) errors.authorship = "Escolha uma opção de autoria válida.";

  const authorName = optional(formData.get("author_name"), CATALOG_AUTHOR_MAX, "author_name", errors);
  const category = optional(formData.get("category"), CATALOG_SHORT_MAX, "category", errors);
  const theme = optional(formData.get("theme"), CATALOG_SHORT_MAX, "theme", errors);
  const description = optional(formData.get("description"), CATALOG_DESCRIPTION_MAX, "description", errors);

  const yearRaw = text(formData.get("published_year"));
  let publishedYear: number | null = null;
  if (yearRaw) {
    if (!/^-?\d{1,4}$/.test(yearRaw)) errors.published_year = "Informe um ano válido.";
    else {
      publishedYear = Number(yearRaw);
      if (!Number.isInteger(publishedYear) || publishedYear < -5000 || publishedYear > 3000) errors.published_year = "Informe um ano entre -5000 e 3000.";
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      kind: kind as CatalogKindValue,
      authorship: authorship as CatalogAuthorshipValue,
      author_name: authorName,
      published_year: publishedYear,
      category,
      theme,
      description,
      retrieval_enabled: formData.get("retrieval_enabled") === "on",
    },
  };
}
