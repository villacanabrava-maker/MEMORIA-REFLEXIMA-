import "server-only";
import { requireUser } from "@/lib/auth/require-user";
import { isMemoryId, type MemoryStatus, type MemoryType } from "./validation";

export type MemorySummary = {
  id: string;
  nodeType: MemoryType;
  title: string;
  reflection: string | null;
  status: MemoryStatus;
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MemoryEvidence = {
  id: string;
  sourceLabel: string;
  excerpt: string;
  role: "supports" | "context" | "contrasts" | "example";
  note: string | null;
  documentStorageKey: string | null;
};

export type MemoryDetail = MemorySummary & { evidence: MemoryEvidence[] };

export async function listMemories(): Promise<MemorySummary[] | null> {
  const { supabase, user } = await requireUser();
  try {
    const { data, error } = await supabase
      .from("memory_nodes")
      .select("id,node_type,title,reflection,status,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error || !data) return null;

    const ids = data.map((row) => row.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: links, error: linksError } = await supabase
        .from("memory_evidence")
        .select("memory_id")
        .eq("user_id", user.id)
        .in("memory_id", ids);
      if (linksError) return null;
      for (const link of links ?? []) counts.set(link.memory_id, (counts.get(link.memory_id) ?? 0) + 1);
    }

    return data.map((row) => ({
      id: row.id,
      nodeType: row.node_type as MemoryType,
      title: row.title,
      reflection: row.reflection,
      status: row.status as MemoryStatus,
      evidenceCount: counts.get(row.id) ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return null;
  }
}

export async function getMemory(id: string): Promise<MemoryDetail | null> {
  if (!isMemoryId(id)) return null;
  const { supabase, user } = await requireUser();
  try {
    const { data: memory, error } = await supabase
      .from("memory_nodes")
      .select("id,node_type,title,reflection,status,created_at,updated_at")
      .eq("user_id", user.id)
      .eq("id", id)
      .maybeSingle();
    if (error || !memory) return null;

    const { data: links, error: linkError } = await supabase
      .from("memory_evidence")
      .select("evidence_id,role,note")
      .eq("user_id", user.id)
      .eq("memory_id", id)
      .order("created_at", { ascending: true });
    if (linkError) return null;

    const evidenceIds = (links ?? []).map((link) => link.evidence_id);
    const evidenceById = new Map<string, { id: string; source_label: string; excerpt: string; document_id: string }>();
    const documentPaths = new Map<string, string>();

    if (evidenceIds.length) {
      const { data: evidence, error: evidenceError } = await supabase
        .from("library_evidence")
        .select("id,source_label,excerpt,document_id")
        .eq("user_id", user.id)
        .in("id", evidenceIds);
      if (evidenceError) return null;
      for (const row of evidence ?? []) evidenceById.set(row.id, row);

      const documentIds = [...new Set((evidence ?? []).map((row) => row.document_id))];
      if (documentIds.length) {
        const { data: documents, error: documentError } = await supabase
          .from("library_documents")
          .select("id,storage_key")
          .eq("user_id", user.id)
          .in("id", documentIds);
        if (documentError) return null;
        for (const doc of documents ?? []) documentPaths.set(doc.id, doc.storage_key);
      }
    }

    const evidence: MemoryEvidence[] = (links ?? []).flatMap((link) => {
      const row = evidenceById.get(link.evidence_id);
      if (!row) return [];
      return [{
        id: row.id,
        sourceLabel: row.source_label,
        excerpt: row.excerpt,
        role: link.role as MemoryEvidence["role"],
        note: link.note,
        documentStorageKey: documentPaths.get(row.document_id) ?? null,
      }];
    });

    return {
      id: memory.id,
      nodeType: memory.node_type as MemoryType,
      title: memory.title,
      reflection: memory.reflection,
      status: memory.status as MemoryStatus,
      evidenceCount: evidence.length,
      createdAt: memory.created_at,
      updatedAt: memory.updated_at,
      evidence,
    };
  } catch {
    return null;
  }
}

export async function getEvidenceForMemoryCreation(id: string | undefined) {
  if (!id || !isMemoryId(id)) return null;
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("library_evidence")
    .select("id,source_label,excerpt")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
  return error ? null : data;
}
