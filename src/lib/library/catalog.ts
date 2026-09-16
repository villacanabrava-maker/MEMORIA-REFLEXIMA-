import "server-only";
import { requireUser } from "@/lib/auth/require-user";

const PAGE_SIZE = 18;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const LIBRARY_KINDS = [
  "book",
  "letter",
  "reflection",
  "report",
  "note",
  "message",
  "work_material",
  "document",
  "text",
  "other",
] as const;

export type LibraryKind = (typeof LIBRARY_KINDS)[number];
export type CatalogFilter = LibraryKind | "all";

export type CatalogItem = {
  id: string;
  title: string;
  kind: LibraryKind;
  authorship: "unknown" | "user" | "external" | "mixed" | "ai";
  authorName: string | null;
  publishedYear: number | null;
  category: string | null;
  theme: string | null;
  description: string | null;
  retrievalEnabled: boolean;
  memoryStatus: "unreviewed" | "not_authorial" | "eligible" | "approved" | "incorporated" | "excluded";
  createdAt: string;
  updatedAt: string;
  href: string | null;
  origin: "document" | "source";
};

export type CatalogResult =
  | { status: "ready"; items: CatalogItem[]; total: number; page: number; pages: number }
  | { status: "error" };

export function isCatalogId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function parseCatalogFilter(value: string | string[] | undefined): CatalogFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && (LIBRARY_KINDS as readonly string[]).includes(raw) ? (raw as LibraryKind) : "all";
}

export function parseCatalogPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parseCatalogQuery(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, 200);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function catalogUrl(filter: CatalogFilter, query = "", page = 1): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("tipo", filter);
  if (query) params.set("q", query);
  if (page > 1) params.set("pagina", String(page));
  const suffix = params.toString();
  return suffix ? `/biblioteca?${suffix}` : "/biblioteca";
}

export function kindLabel(kind: LibraryKind): string {
  return ({
    book: "Livro",
    letter: "Carta",
    reflection: "Reflexão",
    report: "Relatório",
    note: "Nota",
    message: "Mensagem",
    work_material: "Material de trabalho",
    document: "Documento",
    text: "Texto",
    other: "Outro",
  } satisfies Record<LibraryKind, string>)[kind];
}

type CatalogRow = {
  id: string;
  title: string;
  kind: string;
  authorship: string;
  author_name: string | null;
  published_year: number | null;
  category: string | null;
  theme: string | null;
  description: string | null;
  document_id: string | null;
  source_id: string | null;
  retrieval_enabled: boolean;
  authorial_memory_status: string;
  created_at: string;
  updated_at: string;
};

async function hydrateCatalogItems(rows: CatalogRow[], userId: string, supabase: Awaited<ReturnType<typeof requireUser>>["supabase"]): Promise<CatalogItem[] | null> {
  const documentIds = rows.flatMap((item) => item.document_id ? [item.document_id] : []);
  const documentPaths = new Map<string, string>();
  if (documentIds.length) {
    const { data: documents, error: documentError } = await supabase
      .from("library_documents")
      .select("id,storage_key")
      .eq("user_id", userId)
      .in("id", documentIds);
    if (documentError) return null;
    for (const document of documents ?? []) documentPaths.set(document.id, document.storage_key);
  }

  return rows.map((item) => {
    const origin = item.document_id ? "document" as const : "source" as const;
    const storageKey = item.document_id ? documentPaths.get(item.document_id) : null;
    const href = origin === "document"
      ? storageKey ? `/biblioteca/arquivos/${encodeURIComponent(storageKey)}` : null
      : item.source_id ? `/biblioteca/${item.source_id}` : null;

    return {
      id: item.id,
      title: item.title,
      kind: item.kind as LibraryKind,
      authorship: item.authorship as CatalogItem["authorship"],
      authorName: item.author_name,
      publishedYear: item.published_year,
      category: item.category,
      theme: item.theme,
      description: item.description,
      retrievalEnabled: item.retrieval_enabled,
      memoryStatus: item.authorial_memory_status as CatalogItem["memoryStatus"],
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      href,
      origin,
    };
  });
}

export async function getLibraryCatalog(filter: CatalogFilter, query: string, requestedPage: number): Promise<CatalogResult> {
  const { supabase, user } = await requireUser();

  try {
    let counter = supabase.from("library_items").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if (filter !== "all") counter = counter.eq("kind", filter);
    if (query) counter = counter.ilike("title", `%${escapeLike(query)}%`);

    const { count, error: countError } = await counter;
    if (countError || count === null) return { status: "error" };

    const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
    const page = Math.min(Math.max(1, requestedPage), pages);
    if (count === 0) return { status: "ready", items: [], total: 0, page, pages };

    const offset = (page - 1) * PAGE_SIZE;
    let request = supabase
      .from("library_items")
      .select("id,title,kind,authorship,author_name,published_year,category,theme,description,document_id,source_id,retrieval_enabled,authorial_memory_status,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (filter !== "all") request = request.eq("kind", filter);
    if (query) request = request.ilike("title", `%${escapeLike(query)}%`);

    const { data, error } = await request;
    if (error || !data) return { status: "error" };
    const items = await hydrateCatalogItems(data as CatalogRow[], user.id, supabase);
    return items ? { status: "ready", items, total: count, page, pages } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

export async function getCatalogItem(id: string): Promise<CatalogItem | null> {
  if (!isCatalogId(id)) return null;
  const { supabase, user } = await requireUser();
  try {
    const { data, error } = await supabase
      .from("library_items")
      .select("id,title,kind,authorship,author_name,published_year,category,theme,description,document_id,source_id,retrieval_enabled,authorial_memory_status,created_at,updated_at")
      .eq("user_id", user.id)
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const items = await hydrateCatalogItems([data as CatalogRow], user.id, supabase);
    return items?.[0] ?? null;
  } catch {
    return null;
  }
}
