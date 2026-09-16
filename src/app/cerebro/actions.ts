"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { isVersion } from "@/lib/sources/validation";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  isBrainId,
  isOptionalUuid,
  validateBrainFeedback,
  validateBrainInsight,
  type BrainFeedbackState,
  type BrainFormState,
} from "@/lib/brain/validation";

function aiRedirect(query: string, code: string): never {
  const params = new URLSearchParams({ q: query, ia: code });
  redirect(`/cerebro/contexto?${params.toString()}`);
}

function providerErrorCode(value: unknown): string {
  if (!value || typeof value !== "object") return "falha";
  const error = (value as Record<string, unknown>).error;
  return typeof error === "string" && error.length <= 80 ? error : "falha";
}

export async function generateBrainInsights(formData: FormData): Promise<void> {
  const rawQuery = formData.get("query");
  const query = typeof rawQuery === "string" ? rawQuery.trim().slice(0, 200) : "";
  if (!query) aiRedirect("", "consulta_invalida");

  const { supabase } = await requireUser();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) redirect("/login?erro=sessao");

  const { url, publishableKey } = getSupabaseEnv();
  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/brain-insight-generator`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
  } catch {
    aiRedirect(query, "conexao");
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // A resposta do provedor/função pode não conter JSON em uma falha de infraestrutura.
  }

  if (!response.ok) aiRedirect(query, providerErrorCode(payload));
  if (!payload || typeof payload !== "object" || (payload as Record<string, unknown>).ok !== true) {
    aiRedirect(query, providerErrorCode(payload));
  }

  const insightIds = (payload as Record<string, unknown>).insight_ids;
  const firstInsightId = Array.isArray(insightIds) && typeof insightIds[0] === "string" ? insightIds[0] : null;

  revalidatePath("/");
  revalidatePath("/cerebro");
  revalidatePath("/cerebro/contexto");

  if (firstInsightId && isBrainId(firstInsightId)) redirect(`/cerebro/${firstInsightId}?origem=ia`);
  redirect("/cerebro?gerado=ia");
}

export async function saveBrainInsight(previous: BrainFormState, formData: FormData): Promise<BrainFormState> {
  void previous;
  const validation = validateBrainInsight(formData);
  if (!validation.ok) return { message: "Revise os campos indicados.", errors: validation.errors };

  const memoryRaw = formData.get("memory_id");
  const evidenceRaw = formData.get("evidence_id");
  if (!isOptionalUuid(memoryRaw) || !isOptionalUuid(evidenceRaw)) return { message: "Uma das referências selecionadas é inválida." };
  const memoryId = typeof memoryRaw === "string" && memoryRaw ? memoryRaw : null;
  const evidenceId = typeof evidenceRaw === "string" && evidenceRaw ? evidenceRaw : null;

  const { supabase, user } = await requireUser();
  const id = formData.get("id");
  const version = formData.get("version");
  let insightId: string;

  try {
    if (id !== null) {
      if (!isBrainId(id) || !isVersion(version)) return { message: "Não foi possível identificar a versão desta interpretação." };
      const { data, error } = await supabase
        .from("brain_insights")
        .update(validation.value)
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("updated_at", version)
        .select("id")
        .maybeSingle();
      if (error) return { message: "Não foi possível salvar esta interpretação agora." };
      if (!data) return { message: "Esta interpretação mudou em outra aba. Reabra a versão atual antes de salvar." };
      insightId = data.id;
    } else {
      const { data, error } = await supabase.from("brain_insights").insert(validation.value).select("id").single();
      if (error || !data) return { message: "Não foi possível criar esta interpretação agora." };
      insightId = data.id;
    }

    if (memoryId) {
      const { error } = await supabase.from("brain_insight_memories").upsert({ insight_id: insightId, memory_id: memoryId, role: "supports" }, { onConflict: "insight_id,memory_id" });
      if (error) return { message: "A interpretação foi salva, mas a memória selecionada não pôde ser vinculada." };
    }

    if (evidenceId) {
      const { error } = await supabase.from("brain_insight_evidence").upsert({ insight_id: insightId, evidence_id: evidenceId, role: "supports" }, { onConflict: "insight_id,evidence_id" });
      if (error) return { message: "A interpretação foi salva, mas a evidência selecionada não pôde ser vinculada." };
    }
  } catch {
    return { message: "A conexão foi interrompida. Confira Meu Cérebro antes de repetir a operação." };
  }

  revalidatePath("/");
  revalidatePath("/cerebro");
  revalidatePath(`/cerebro/${insightId}`);
  redirect(`/cerebro/${insightId}`);
}

export async function saveBrainFeedback(previous: BrainFeedbackState, formData: FormData): Promise<BrainFeedbackState> {
  void previous;
  const insightId = formData.get("insight_id");
  if (!isBrainId(insightId)) return { message: "Não foi possível identificar a interpretação." };
  const validation = validateBrainFeedback(formData);
  if (!validation.ok) return { message: "Revise sua avaliação.", errors: validation.errors };

  const { supabase, user } = await requireUser();
  try {
    const { data: insight, error: insightError } = await supabase.from("brain_insights").select("id").eq("id", insightId).eq("user_id", user.id).maybeSingle();
    if (insightError || !insight) return { message: "Esta interpretação não está disponível." };
    const { error } = await supabase.from("brain_feedback").insert({ insight_id: insightId, ...validation.value });
    if (error) return { message: "Não foi possível registrar sua avaliação agora." };
  } catch {
    return { message: "A conexão foi interrompida. Sua avaliação não foi confirmada." };
  }

  revalidatePath(`/cerebro/${insightId}`);
  revalidatePath("/cerebro");
  redirect(`/cerebro/${insightId}?feedback=salvo`);
}
