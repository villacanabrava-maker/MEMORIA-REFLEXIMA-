"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { isReflectionId, validateReflectionTitle, validateReflectionVersion, type ReflectionFormState } from "@/lib/reflections/validation";

const CONTEXT_ROLES = new Set(["supports", "context", "contrasts", "example"]);
const CONTEXT_KINDS = new Set(["memory", "evidence", "insight"]);

export async function createReflection(previous: ReflectionFormState, formData: FormData): Promise<ReflectionFormState> {
  void previous;
  const title = validateReflectionTitle(formData.get("title"));
  if (!title.ok) return { message: "Revise o título.", errors: { title: title.error } };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("reflections").insert({ title: title.value }).select("id").single();
  if (error || !data) return { message: "Não foi possível criar esta reflexão agora." };
  revalidatePath("/");
  revalidatePath("/reflexoes");
  redirect(`/reflexoes/${data.id}`);
}

export async function addReflectionVersion(previous: ReflectionFormState, formData: FormData): Promise<ReflectionFormState> {
  void previous;
  const reflectionId = formData.get("reflection_id");
  if (!isReflectionId(reflectionId)) return { message: "Reflexão inválida." };
  const validation = validateReflectionVersion(formData);
  if (!validation.ok) return { message: "Revise os campos indicados.", errors: validation.errors };
  const { supabase, user } = await requireUser();
  const { data: reflection, error: reflectionError } = await supabase
    .from("reflections")
    .select("status")
    .eq("id", reflectionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (reflectionError || !reflection) return { message: "Reflexão não encontrada." };
  if (!["draft", "review"].includes(reflection.status)) return { message: "Esta reflexão está encerrada para novas versões." };

  const { error } = await supabase.from("reflection_versions").insert({ reflection_id: reflectionId, ...validation.value });
  if (error) return { message: "Não foi possível salvar esta etapa agora." };
  revalidatePath(`/reflexoes/${reflectionId}`);
  redirect(`/reflexoes/${reflectionId}?salvo=1`);
}

async function editableReflection(reflectionId: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("reflections")
    .select("status")
    .eq("id", reflectionId)
    .eq("user_id", user.id)
    .maybeSingle();
  return { supabase, user, editable: !error && data !== null && ["draft", "review"].includes(data.status) };
}

export async function saveReflectionContextLink(formData: FormData) {
  const reflectionId = formData.get("reflection_id");
  const targetId = formData.get("target_id");
  const kind = formData.get("kind");
  const role = formData.get("role");
  if (!isReflectionId(reflectionId) || !isReflectionId(targetId) || typeof kind !== "string" || !CONTEXT_KINDS.has(kind) || typeof role !== "string" || !CONTEXT_ROLES.has(role)) return;

  const { supabase, editable } = await editableReflection(reflectionId);
  if (!editable) redirect(`/reflexoes/${reflectionId}?erro=contexto`);

  let error = null;
  if (kind === "memory") {
    ({ error } = await supabase.from("reflection_memories").upsert({ reflection_id: reflectionId, memory_id: targetId, role }, { onConflict: "reflection_id,memory_id" }));
  } else if (kind === "evidence") {
    ({ error } = await supabase.from("reflection_evidence").upsert({ reflection_id: reflectionId, evidence_id: targetId, role }, { onConflict: "reflection_id,evidence_id" }));
  } else {
    ({ error } = await supabase.from("reflection_insights").upsert({ reflection_id: reflectionId, insight_id: targetId, role }, { onConflict: "reflection_id,insight_id" }));
  }
  if (error) redirect(`/reflexoes/${reflectionId}?erro=contexto`);
  revalidatePath(`/reflexoes/${reflectionId}`);
  redirect(`/reflexoes/${reflectionId}?contexto=1`);
}

export async function removeReflectionContextLink(formData: FormData) {
  const reflectionId = formData.get("reflection_id");
  const targetId = formData.get("target_id");
  const kind = formData.get("kind");
  if (!isReflectionId(reflectionId) || !isReflectionId(targetId) || typeof kind !== "string" || !CONTEXT_KINDS.has(kind)) return;

  const { supabase, user, editable } = await editableReflection(reflectionId);
  if (!editable) redirect(`/reflexoes/${reflectionId}?erro=contexto`);

  let query;
  if (kind === "memory") query = supabase.from("reflection_memories").delete().eq("reflection_id", reflectionId).eq("memory_id", targetId).eq("user_id", user.id);
  else if (kind === "evidence") query = supabase.from("reflection_evidence").delete().eq("reflection_id", reflectionId).eq("evidence_id", targetId).eq("user_id", user.id);
  else query = supabase.from("reflection_insights").delete().eq("reflection_id", reflectionId).eq("insight_id", targetId).eq("user_id", user.id);
  const { error } = await query;
  if (error) redirect(`/reflexoes/${reflectionId}?erro=contexto`);
  revalidatePath(`/reflexoes/${reflectionId}`);
  redirect(`/reflexoes/${reflectionId}?contexto=removido`);
}

async function transition(reflectionId: FormDataEntryValue | null, rpc: "submit_reflection_for_review" | "return_reflection_to_draft" | "archive_reflection", query: string) {
  if (!isReflectionId(reflectionId)) return;
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc(rpc, { p_reflection_id: reflectionId });
  if (error) redirect(`/reflexoes/${reflectionId}?erro=transicao`);
  revalidatePath("/reflexoes");
  revalidatePath(`/reflexoes/${reflectionId}`);
  redirect(`/reflexoes/${reflectionId}?${query}=1`);
}

export async function submitReflectionForReview(formData: FormData) {
  await transition(formData.get("reflection_id"), "submit_reflection_for_review", "revisao");
}

export async function returnReflectionToDraft(formData: FormData) {
  await transition(formData.get("reflection_id"), "return_reflection_to_draft", "rascunho");
}

export async function archiveReflection(formData: FormData) {
  await transition(formData.get("reflection_id"), "archive_reflection", "arquivada");
}

export async function approveReflection(formData: FormData) {
  const reflectionId = formData.get("reflection_id");
  const versionId = formData.get("version_id");
  if (!isReflectionId(reflectionId) || !isReflectionId(versionId)) return;
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("approve_reflection", { p_reflection_id: reflectionId, p_version_id: versionId });
  if (error) redirect(`/reflexoes/${reflectionId}?erro=aprovacao`);
  revalidatePath("/");
  revalidatePath("/reflexoes");
  revalidatePath(`/reflexoes/${reflectionId}`);
  redirect(`/reflexoes/${reflectionId}?aprovada=1`);
}
