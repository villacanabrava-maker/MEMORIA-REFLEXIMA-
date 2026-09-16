import "server-only";
import { requireUser } from "@/lib/auth/require-user";

export type LibraryContentMatch = {
  documentId: string;
  storageKey: string;
  fileName: string;
  sourceKind: "page" | "chunk";
  locationLabel: string;
  pageNumber: number | null;
  chunkIndex: number | null;
  excerpt: string;
  rank: number;
};

export type LibraryContentSearchResult =
  | { status: "ready"; query: string; matches: LibraryContentMatch[] }
  | { status: "error"; query: string; matches: [] };

export function normalizeContentSearchQuery(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] ?? "" : value ?? "";
  return raw.trim().replace(/\s+/g, " ").slice(0, 200);
}

export async function searchLibraryContent(query: string): Promise<LibraryContentSearchResult> {
  const normalized = query.trim().replace(/\s+/g, " ").slice(0, 200);
  if (!normalized) return { status: "ready", query: "", matches: [] };

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("search_library_content", {
    p_query: normalized,
    p_limit: 50,
  });

  if (error || !Array.isArray(data)) return { status: "error", query: normalized, matches: [] };

  const matches: LibraryContentMatch[] = data.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const value = row as Record<string, unknown>;
    if (
      typeof value.document_id !== "string" ||
      typeof value.storage_key !== "string" ||
      typeof value.file_name !== "string" ||
      (value.source_kind !== "page" && value.source_kind !== "chunk") ||
      typeof value.location_label !== "string" ||
      typeof value.excerpt !== "string"
    ) return [];

    return [{
      documentId: value.document_id,
      storageKey: value.storage_key,
      fileName: value.file_name,
      sourceKind: value.source_kind,
      locationLabel: value.location_label,
      pageNumber: typeof value.page_number === "number" ? value.page_number : null,
      chunkIndex: typeof value.chunk_index === "number" ? value.chunk_index : null,
      excerpt: value.excerpt,
      rank: typeof value.rank === "number" ? value.rank : 0,
    }];
  });

  return { status: "ready", query: normalized, matches };
}
