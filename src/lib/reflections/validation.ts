export const REFLECTION_STAGES = [
  ["external", "1. Externa"],
  ["commentary", "2. Meu comentário"],
  ["conflicts", "4. Conflitos"],
  ["plan", "5. Plano"],
  ["revision", "7. Revisão"],
] as const;

export const REFLECTION_STATUSES = ["draft", "review", "approved", "archived"] as const;
export type ReflectionStage = (typeof REFLECTION_STAGES)[number][0];
export type ReflectionStatus = (typeof REFLECTION_STATUSES)[number];
export type ReflectionFormState = { message: string; errors?: Partial<Record<"title" | "stage" | "content", string>> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isReflectionId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function reflectionStatusLabel(status: ReflectionStatus) {
  if (status === "review") return "Em revisão";
  if (status === "approved") return "Aprovada";
  if (status === "archived") return "Arquivada";
  return "Rascunho";
}

export function reflectionStageLabel(stage: string) {
  if (stage === "ai_draft") return "6. Rascunho de IA";
  if (stage === "approved") return "Versão aprovada";
  return REFLECTION_STAGES.find(([value]) => value === stage)?.[1] ?? stage;
}

export function validateReflectionTitle(value: FormDataEntryValue | null) {
  const title = typeof value === "string" ? value.trim() : "";
  if (!title) return { ok: false as const, error: "Dê um título para esta reflexão." };
  if (Array.from(title).length > 200) return { ok: false as const, error: "Use no máximo 200 caracteres." };
  return { ok: true as const, value: title };
}

export function validateReflectionVersion(formData: FormData) {
  const stage = typeof formData.get("stage") === "string" ? String(formData.get("stage")) : "";
  const content = typeof formData.get("content") === "string" ? String(formData.get("content")).trim() : "";
  const errors: NonNullable<ReflectionFormState["errors"]> = {};
  if (!(REFLECTION_STAGES.map(([value]) => value) as readonly string[]).includes(stage)) errors.stage = "Escolha uma etapa válida.";
  if (!content) errors.content = "Escreva o conteúdo desta etapa.";
  else if (Array.from(content).length > 50_000) errors.content = "Use no máximo 50.000 caracteres nesta versão.";
  if (Object.keys(errors).length) return { ok: false as const, errors };
  return { ok: true as const, value: { stage: stage as ReflectionStage, content } };
}
