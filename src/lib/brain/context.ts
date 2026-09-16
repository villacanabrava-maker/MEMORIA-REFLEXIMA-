import "server-only";
import { requireUser } from "@/lib/auth/require-user";

export type BrainContextResult = {
  contextType: "memory" | "evidence";
  contextId: string;
  title: string;
  excerpt: string;
  rank: number;
};

export function parseBrainContextQuery(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, 200);
}

export async function searchBrainContext(query: string): Promise<BrainContextResult[] | null> {
  if (!query) return [];
  const { supabase } = await requireUser();
  try {
    const { data, error } = await supabase.rpc("search_brain_context", { p_query: query, p_limit: 30 });
    if (error || !data) return null;
    return data.map((row: { context_type: string; context_id: string; title: string; excerpt: string; rank: number }) => ({
      contextType: row.context_type as "memory" | "evidence",
      contextId: row.context_id,
      title: row.title,
      excerpt: row.excerpt,
      rank: Number(row.rank ?? 0),
    }));
  } catch {
    return null;
  }
}
