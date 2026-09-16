import "server-only";
import { requireUser } from "@/lib/auth/require-user";

type RecentItem = {
  id: string;
  title: string;
  kind: string;
  updatedAt: string;
  href: string | null;
};

export type DashboardData = {
  libraryItems: number;
  evidence: number;
  memories: number;
  recent: RecentItem[];
};

export async function getDashboardData(): Promise<DashboardData | null> {
  const { supabase, user } = await requireUser();
  try {
    const [itemsCount, evidenceCount, memoryCount, recentResult] = await Promise.all([
      supabase.from("library_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("library_evidence").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("memory_nodes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("library_items")
        .select("id,title,kind,document_id,source_id,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(3),
    ]);

    if (itemsCount.error || evidenceCount.error || memoryCount.error || recentResult.error) return null;
    const rows = recentResult.data ?? [];
    const documentIds = rows.flatMap((row) => row.document_id ? [row.document_id] : []);
    const paths = new Map<string, string>();
    if (documentIds.length) {
      const { data: documents, error } = await supabase.from("library_documents")
        .select("id,storage_key")
        .eq("user_id", user.id)
        .in("id", documentIds);
      if (error) return null;
      for (const doc of documents ?? []) paths.set(doc.id, doc.storage_key);
    }

    const recent = rows.map((row) => ({
      id: row.id,
      title: row.title,
      kind: row.kind,
      updatedAt: row.updated_at,
      href: row.document_id
        ? paths.has(row.document_id) ? `/biblioteca/arquivos/${encodeURIComponent(paths.get(row.document_id)!)}` : null
        : row.source_id ? `/biblioteca/${row.source_id}` : null,
    }));

    return {
      libraryItems: itemsCount.count ?? 0,
      evidence: evidenceCount.count ?? 0,
      memories: memoryCount.count ?? 0,
      recent,
    };
  } catch {
    return null;
  }
}
