import "server-only";
import { requireUser } from "@/lib/auth/require-user";
import { isBrainId, type BrainFeedbackRating, type BrainStatus, type BrainType } from "./validation";

export type BrainInsightSummary = {
  id: string;
  insightType: BrainType;
  title: string;
  statement: string;
  status: BrainStatus;
  origin: "manual" | "ai";
  memoryCount: number;
  evidenceCount: number;
  feedbackCount: number;
  updatedAt: string;
};

export type BrainSupportMemory = { id: string; title: string; role: string; note: string | null };
export type BrainSupportEvidence = { id: string; sourceLabel: string; excerpt: string; role: string; note: string | null; storageKey: string | null };
export type BrainFeedback = { id: string; rating: BrainFeedbackRating; comment: string | null; correction: string | null; createdAt: string };

export type BrainInsightDetail = BrainInsightSummary & {
  generationModel: string | null;
  generationVersion: string | null;
  memories: BrainSupportMemory[];
  evidence: BrainSupportEvidence[];
  feedback: BrainFeedback[];
};

export type BrainCreationMemory = { id: string; title: string; nodeType: string };
export type BrainCreationEvidence = { id: string; sourceLabel: string; excerpt: string };

export async function listBrainInsights(): Promise<BrainInsightSummary[] | null> {
  const { supabase, user } = await requireUser();
  try {
    const { data, error } = await supabase
      .from("brain_insights")
      .select("id,insight_type,title,statement,status,origin,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error || !data) return null;

    const ids = data.map((row) => row.id);
    const memoryCounts = new Map<string, number>();
    const evidenceCounts = new Map<string, number>();
    const feedbackCounts = new Map<string, number>();

    if (ids.length) {
      const [memories, evidence, feedback] = await Promise.all([
        supabase.from("brain_insight_memories").select("insight_id").eq("user_id", user.id).in("insight_id", ids),
        supabase.from("brain_insight_evidence").select("insight_id").eq("user_id", user.id).in("insight_id", ids),
        supabase.from("brain_feedback").select("insight_id").eq("user_id", user.id).in("insight_id", ids),
      ]);
      if (memories.error || evidence.error || feedback.error) return null;
      for (const row of memories.data ?? []) memoryCounts.set(row.insight_id, (memoryCounts.get(row.insight_id) ?? 0) + 1);
      for (const row of evidence.data ?? []) evidenceCounts.set(row.insight_id, (evidenceCounts.get(row.insight_id) ?? 0) + 1);
      for (const row of feedback.data ?? []) feedbackCounts.set(row.insight_id, (feedbackCounts.get(row.insight_id) ?? 0) + 1);
    }

    return data.map((row) => ({
      id: row.id,
      insightType: row.insight_type as BrainType,
      title: row.title,
      statement: row.statement,
      status: row.status as BrainStatus,
      origin: row.origin as "manual" | "ai",
      memoryCount: memoryCounts.get(row.id) ?? 0,
      evidenceCount: evidenceCounts.get(row.id) ?? 0,
      feedbackCount: feedbackCounts.get(row.id) ?? 0,
      updatedAt: row.updated_at,
    }));
  } catch {
    return null;
  }
}

export async function getBrainInsight(id: string): Promise<BrainInsightDetail | null> {
  if (!isBrainId(id)) return null;
  const { supabase, user } = await requireUser();
  try {
    const { data: insight, error } = await supabase
      .from("brain_insights")
      .select("id,insight_type,title,statement,status,origin,generation_model,generation_version,updated_at")
      .eq("user_id", user.id)
      .eq("id", id)
      .maybeSingle();
    if (error || !insight) return null;

    const [memoryLinks, evidenceLinks, feedbackRows] = await Promise.all([
      supabase.from("brain_insight_memories").select("memory_id,role,note").eq("user_id", user.id).eq("insight_id", id).order("created_at", { ascending: true }),
      supabase.from("brain_insight_evidence").select("evidence_id,role,note").eq("user_id", user.id).eq("insight_id", id).order("created_at", { ascending: true }),
      supabase.from("brain_feedback").select("id,rating,comment,correction,created_at").eq("user_id", user.id).eq("insight_id", id).order("created_at", { ascending: false }),
    ]);
    if (memoryLinks.error || evidenceLinks.error || feedbackRows.error) return null;

    const memoryIds = (memoryLinks.data ?? []).map((row) => row.memory_id);
    const memoryById = new Map<string, { id: string; title: string }>();
    if (memoryIds.length) {
      const { data: memories, error: memoryError } = await supabase.from("memory_nodes").select("id,title").eq("user_id", user.id).in("id", memoryIds);
      if (memoryError) return null;
      for (const row of memories ?? []) memoryById.set(row.id, row);
    }

    const evidenceIds = (evidenceLinks.data ?? []).map((row) => row.evidence_id);
    const evidenceById = new Map<string, { id: string; source_label: string; excerpt: string; document_id: string }>();
    const documentPaths = new Map<string, string>();
    if (evidenceIds.length) {
      const { data: evidence, error: evidenceError } = await supabase.from("library_evidence").select("id,source_label,excerpt,document_id").eq("user_id", user.id).in("id", evidenceIds);
      if (evidenceError) return null;
      for (const row of evidence ?? []) evidenceById.set(row.id, row);
      const documentIds = [...new Set((evidence ?? []).map((row) => row.document_id))];
      if (documentIds.length) {
        const { data: documents, error: documentError } = await supabase.from("library_documents").select("id,storage_key").eq("user_id", user.id).in("id", documentIds);
        if (documentError) return null;
        for (const row of documents ?? []) documentPaths.set(row.id, row.storage_key);
      }
    }

    const memories: BrainSupportMemory[] = (memoryLinks.data ?? []).flatMap((link) => {
      const memory = memoryById.get(link.memory_id);
      return memory ? [{ id: memory.id, title: memory.title, role: link.role, note: link.note }] : [];
    });

    const evidence: BrainSupportEvidence[] = (evidenceLinks.data ?? []).flatMap((link) => {
      const row = evidenceById.get(link.evidence_id);
      return row ? [{ id: row.id, sourceLabel: row.source_label, excerpt: row.excerpt, role: link.role, note: link.note, storageKey: documentPaths.get(row.document_id) ?? null }] : [];
    });

    const feedback: BrainFeedback[] = (feedbackRows.data ?? []).map((row) => ({
      id: row.id,
      rating: row.rating as BrainFeedbackRating,
      comment: row.comment,
      correction: row.correction,
      createdAt: row.created_at,
    }));

    return {
      id: insight.id,
      insightType: insight.insight_type as BrainType,
      title: insight.title,
      statement: insight.statement,
      status: insight.status as BrainStatus,
      origin: insight.origin as "manual" | "ai",
      generationModel: insight.generation_model,
      generationVersion: insight.generation_version,
      memoryCount: memories.length,
      evidenceCount: evidence.length,
      feedbackCount: feedback.length,
      updatedAt: insight.updated_at,
      memories,
      evidence,
      feedback,
    };
  } catch {
    return null;
  }
}

export async function getBrainCreationSources(): Promise<{ memories: BrainCreationMemory[]; evidence: BrainCreationEvidence[] } | null> {
  const { supabase, user } = await requireUser();
  try {
    const [memories, evidence] = await Promise.all([
      supabase.from("memory_nodes").select("id,title,node_type").eq("user_id", user.id).neq("status", "archived").order("updated_at", { ascending: false }).limit(100),
      supabase.from("library_evidence").select("id,source_label,excerpt").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    ]);
    if (memories.error || evidence.error) return null;
    return {
      memories: (memories.data ?? []).map((row) => ({ id: row.id, title: row.title, nodeType: row.node_type })),
      evidence: (evidence.data ?? []).map((row) => ({ id: row.id, sourceLabel: row.source_label, excerpt: row.excerpt })),
    };
  } catch {
    return null;
  }
}
