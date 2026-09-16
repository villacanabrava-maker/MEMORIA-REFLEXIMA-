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
