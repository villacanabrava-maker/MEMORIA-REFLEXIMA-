import "server-only";
import { requireUser } from "@/lib/auth/require-user";
import { isReflectionId, type ReflectionStatus } from "./validation";

export type ReflectionSummary = {
  id: string;
  title: string;
  status: ReflectionStatus;
  approvedVersionId: string | null;
  approvedAt: string | null;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ReflectionVersion = {
  id: string;
  stage: string;
  content: string;
  authorKind: "user" | "ai";
  generationRunId: string | null;
  createdAt: string;
};

export type ReflectionDetail = ReflectionSummary & { versions: ReflectionVersion[] };
export type ContextRole = "supports" | "context" | "contrasts" | "example";

export type ReflectionContext = {
  memories: Array<{ id: string; title: string; reflection: string | null; role: ContextRole; note: string | null }>;
  evidence: Array<{ id: string; sourceLabel: string; excerpt: string; role: ContextRole; note: string | null; storageKey: string | null }>;
  insights: Array<{ id: string; title: string; statement: string; role: ContextRole; note: string | null }>;
  memoryOptions: Array<{ id: string; title: string; reflection: string | null }>;
  evidenceOptions: Array<{ id: string; sourceLabel: string; excerpt: string }>;
  insightOptions: Array<{ id: string; title: string; statement: string }>;
};

export async function listReflections(): Promise<ReflectionSummary[] | null> {
  const { supabase, user } = await requireUser();
  try {
    const { data, error } = await supabase
      .from("reflections")
      .select("id,title,status,approved_version_id,approved_at,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error || !data) return null;

    const ids = data.map((row) => row.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: versions, error: versionsError } = await supabase
        .from("reflection_versions")
        .select("reflection_id")
        .eq("user_id", user.id)
        .in("reflection_id", ids);
      if (versionsError) return null;
      for (const row of versions ?? []) counts.set(row.reflection_id, (counts.get(row.reflection_id) ?? 0) + 1);
    }

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status as ReflectionStatus,
      approvedVersionId: row.approved_version_id,
      approvedAt: row.approved_at,
      versionCount: counts.get(row.id) ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return null;
  }
}

export async function getReflection(id: string): Promise<ReflectionDetail | null> {
  if (!isReflectionId(id)) return null;
  const { supabase, user } = await requireUser();
  try {
    const { data: reflection, error } = await supabase
      .from("reflections")
      .select("id,title,status,approved_version_id,approved_at,created_at,updated_at")
      .eq("user_id", user.id)
      .eq("id", id)
      .maybeSingle();
    if (error || !reflection) return null;

    const { data: versions, error: versionsError } = await supabase
      .from("reflection_versions")
      .select("id,stage,content,author_kind,generation_run_id,created_at")
      .eq("user_id", user.id)
      .eq("reflection_id", id)
      .order("created_at", { ascending: true });
    if (versionsError) return null;

    return {
      id: reflection.id,
      title: reflection.title,
      status: reflection.status as ReflectionStatus,
      approvedVersionId: reflection.approved_version_id,
      approvedAt: reflection.approved_at,
      versionCount: versions?.length ?? 0,
      createdAt: reflection.created_at,
      updatedAt: reflection.updated_at,
      versions: (versions ?? []).map((row) => ({
        id: row.id,
        stage: row.stage,
        content: row.content,
        authorKind: row.author_kind as "user" | "ai",
        generationRunId: row.generation_run_id,
        createdAt: row.created_at,
      })),
    };
  } catch {
    return null;
  }
}

export async function getReflectionContext(id: string): Promise<ReflectionContext | null> {
  if (!isReflectionId(id)) return null;
  const { supabase, user } = await requireUser();
  try {
    const [memoryLinksResult, evidenceLinksResult, insightLinksResult, memoryOptionsResult, evidenceOptionsResult, insightOptionsResult] = await Promise.all([
      supabase.from("reflection_memories").select("memory_id,role,note").eq("user_id", user.id).eq("reflection_id", id).order("created_at", { ascending: true }),
      supabase.from("reflection_evidence").select("evidence_id,role,note").eq("user_id", user.id).eq("reflection_id", id).order("created_at", { ascending: true }),
      supabase.from("reflection_insights").select("insight_id,role,note").eq("user_id", user.id).eq("reflection_id", id).order("created_at", { ascending: true }),
      supabase.from("memory_nodes").select("id,title,reflection").eq("user_id", user.id).neq("status", "archived").order("updated_at", { ascending: false }).limit(100),
      supabase.from("library_evidence").select("id,source_label,excerpt,document_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("brain_insights").select("id,title,statement").eq("user_id", user.id).neq("status", "archived").order("updated_at", { ascending: false }).limit(100),
    ]);

    if (memoryLinksResult.error || evidenceLinksResult.error || insightLinksResult.error || memoryOptionsResult.error || evidenceOptionsResult.error || insightOptionsResult.error) return null;

    const memoryLinks = memoryLinksResult.data ?? [];
    const evidenceLinks = evidenceLinksResult.data ?? [];
    const insightLinks = insightLinksResult.data ?? [];
    const linkedMemoryIds = memoryLinks.map((row) => row.memory_id);
    const linkedEvidenceIds = evidenceLinks.map((row) => row.evidence_id);
    const linkedInsightIds = insightLinks.map((row) => row.insight_id);

    const [linkedMemoriesResult, linkedEvidenceResult, linkedInsightsResult] = await Promise.all([
      linkedMemoryIds.length
        ? supabase.from("memory_nodes").select("id,title,reflection").eq("user_id", user.id).in("id", linkedMemoryIds)
        : Promise.resolve({ data: [], error: null }),
      linkedEvidenceIds.length
        ? supabase.from("library_evidence").select("id,source_label,excerpt,document_id").eq("user_id", user.id).in("id", linkedEvidenceIds)
        : Promise.resolve({ data: [], error: null }),
      linkedInsightIds.length
        ? supabase.from("brain_insights").select("id,title,statement").eq("user_id", user.id).in("id", linkedInsightIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (linkedMemoriesResult.error || linkedEvidenceResult.error || linkedInsightsResult.error) return null;

    const memoryById = new Map((linkedMemoriesResult.data ?? []).map((row) => [row.id, row]));
    const evidenceById = new Map((linkedEvidenceResult.data ?? []).map((row) => [row.id, row]));
    const insightById = new Map((linkedInsightsResult.data ?? []).map((row) => [row.id, row]));

    const linkedDocumentIds = [...new Set((linkedEvidenceResult.data ?? []).map((row) => row.document_id).filter(Boolean))];
    const storageByDocument = new Map<string, string>();
    if (linkedDocumentIds.length) {
      const { data: documents, error: documentsError } = await supabase
        .from("library_documents")
        .select("id,storage_key")
        .eq("user_id", user.id)
        .in("id", linkedDocumentIds);
      if (documentsError) return null;
      for (const document of documents ?? []) storageByDocument.set(document.id, document.storage_key);
    }

    return {
      memories: memoryLinks.flatMap((link) => {
        const row = memoryById.get(link.memory_id);
        return row ? [{ id: row.id, title: row.title, reflection: row.reflection, role: link.role as ContextRole, note: link.note }] : [];
      }),
      evidence: evidenceLinks.flatMap((link) => {
        const row = evidenceById.get(link.evidence_id);
        return row ? [{ id: row.id, sourceLabel: row.source_label, excerpt: row.excerpt, role: link.role as ContextRole, note: link.note, storageKey: storageByDocument.get(row.document_id) ?? null }] : [];
      }),
      insights: insightLinks.flatMap((link) => {
        const row = insightById.get(link.insight_id);
        return row ? [{ id: row.id, title: row.title, statement: row.statement, role: link.role as ContextRole, note: link.note }] : [];
      }),
      memoryOptions: (memoryOptionsResult.data ?? []).map((row) => ({ id: row.id, title: row.title, reflection: row.reflection })),
      evidenceOptions: (evidenceOptionsResult.data ?? []).map((row) => ({ id: row.id, sourceLabel: row.source_label, excerpt: row.excerpt })),
      insightOptions: (insightOptionsResult.data ?? []).map((row) => ({ id: row.id, title: row.title, statement: row.statement })),
    };
  } catch {
    return null;
  }
}
