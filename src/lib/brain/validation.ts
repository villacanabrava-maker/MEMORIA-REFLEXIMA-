export const BRAIN_TYPES = [
  ["writing_style", "Estilo de escrita"],
  ["theme", "Tema recorrente"],
  ["concept", "Conceito"],
  ["thinking_pattern", "Forma de pensar"],
  ["story_pattern", "Padrão de histórias"],
  ["evolution", "Evolução"],
  ["tension", "Tensão / conflito"],
  ["other", "Outra interpretação"],
] as const;

export const BRAIN_STATUSES = [
  ["draft", "Em revisão"],
  ["confirmed", "Confirmada por mim"],
  ["rejected", "Rejeitada por mim"],
  ["archived", "Arquivada"],
] as const;

export const FEEDBACK_RATINGS = [
  ["correct", "Correto"],
  ["partial", "Parcialmente correto"],
  ["incorrect", "Incorreto"],
] as const;

export type BrainType = (typeof BRAIN_TYPES)[number][0];
export type BrainStatus = (typeof BRAIN_STATUSES)[number][0];
export type BrainFeedbackRating = (typeof FEEDBACK_RATINGS)[number][0];
export type BrainFormState = { message: string; errors?: Partial<Record<"title" | "insight_type" | "statement" | "status", string>> };
export type BrainFeedbackState = { message: string; errors?: Partial<Record<"rating" | "comment" | "correction", string>> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isBrainId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function isOptionalUuid(value: unknown): value is string | null {
  return value === null || value === "" || (typeof value === "string" && UUID.test(value));
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateBrainInsight(formData: FormData) {
  const errors: NonNullable<BrainFormState["errors"]> = {};
  const title = text(formData.get("title"));
  const insightType = text(formData.get("insight_type"));
  const statement = text(formData.get("statement"));
  const status = text(formData.get("status"));

  if (!title) errors.title = "Dê um nome para esta interpretação.";
  else if (Array.from(title).length > 200) errors.title = "Use no máximo 200 caracteres.";
  if (!(BRAIN_TYPES.map(([value]) => value) as readonly string[]).includes(insightType)) errors.insight_type = "Escolha um tipo válido.";
  if (!statement) errors.statement = "Descreva a interpretação.";
  else if (Array.from(statement).length > 12_000) errors.statement = "Use no máximo 12.000 caracteres.";
  if (!(BRAIN_STATUSES.map(([value]) => value) as readonly string[]).includes(status)) errors.status = "Escolha um estado válido.";

  if (Object.keys(errors).length) return { ok: false as const, errors };
  return { ok: true as const, value: { title, insight_type: insightType as BrainType, statement, status: status as BrainStatus } };
}

export function validateBrainFeedback(formData: FormData) {
  const errors: NonNullable<BrainFeedbackState["errors"]> = {};
  const rating = text(formData.get("rating"));
  const comment = text(formData.get("comment"));
  const correction = text(formData.get("correction"));

  if (!(FEEDBACK_RATINGS.map(([value]) => value) as readonly string[]).includes(rating)) errors.rating = "Escolha uma avaliação válida.";
  if (Array.from(comment).length > 4_000) errors.comment = "Use no máximo 4.000 caracteres.";
  if (Array.from(correction).length > 12_000) errors.correction = "Use no máximo 12.000 caracteres.";

  if (Object.keys(errors).length) return { ok: false as const, errors };
  return { ok: true as const, value: { rating: rating as BrainFeedbackRating, comment: comment || null, correction: correction || null } };
}

export function brainTypeLabel(value: BrainType): string {
  return BRAIN_TYPES.find(([type]) => type === value)?.[1] ?? value;
}

export function brainStatusLabel(value: BrainStatus): string {
  return BRAIN_STATUSES.find(([status]) => status === value)?.[1] ?? value;
}

export function feedbackLabel(value: BrainFeedbackRating): string {
  return FEEDBACK_RATINGS.find(([rating]) => rating === value)?.[1] ?? value;
}
