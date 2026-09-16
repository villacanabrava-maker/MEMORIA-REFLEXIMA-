export const BRAIN_AI_CONTRACT_VERSION = "brain-insight-v1";

const INSIGHT_TYPES = ["writing_style", "theme", "concept", "thinking_pattern", "story_pattern", "evolution", "tension", "other"] as const;
const SUPPORT_ROLES = ["supports", "context", "contrasts", "example"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const brainSuggestionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["insight_type", "title", "statement", "memory_refs", "evidence_refs", "caveat"],
        properties: {
          insight_type: { type: "string", enum: [...INSIGHT_TYPES] },
          title: { type: "string", minLength: 1, maxLength: 200 },
          statement: { type: "string", minLength: 1, maxLength: 12000 },
          memory_refs: {
            type: "array",
            maxItems: 12,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "role"],
              properties: {
                id: { type: "string", format: "uuid" },
                role: { type: "string", enum: [...SUPPORT_ROLES] },
              },
            },
          },
          evidence_refs: {
            type: "array",
            maxItems: 20,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "role"],
              properties: {
                id: { type: "string", format: "uuid" },
                role: { type: "string", enum: [...SUPPORT_ROLES] },
              },
            },
          },
          caveat: { type: "string", maxLength: 1000 },
        },
      },
    },
  },
} as const;

export type BrainAIReference = { id: string; role: (typeof SUPPORT_ROLES)[number] };
export type BrainAISuggestion = {
  insight_type: (typeof INSIGHT_TYPES)[number];
  title: string;
  statement: string;
  memory_refs: BrainAIReference[];
  evidence_refs: BrainAIReference[];
  caveat: string;
};
export type BrainAISuggestionPayload = { suggestions: BrainAISuggestion[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArrayMember<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function validateReference(value: unknown, allowedIds: ReadonlySet<string>): value is BrainAIReference {
  if (!isObject(value) || Object.keys(value).some((key) => key !== "id" && key !== "role")) return false;
  return typeof value.id === "string" && UUID.test(value.id) && allowedIds.has(value.id) && isStringArrayMember(value.role, SUPPORT_ROLES);
}

export function validateBrainAISuggestions(
  value: unknown,
  allowedMemoryIds: ReadonlySet<string>,
  allowedEvidenceIds: ReadonlySet<string>,
): { ok: true; value: BrainAISuggestionPayload } | { ok: false; message: string } {
  if (!isObject(value) || Object.keys(value).some((key) => key !== "suggestions") || !Array.isArray(value.suggestions)) {
    return { ok: false, message: "A resposta não segue o contrato de sugestões." };
  }
  if (value.suggestions.length > 5) return { ok: false, message: "A resposta trouxe sugestões demais." };

  const suggestions: BrainAISuggestion[] = [];
  for (const candidate of value.suggestions) {
    if (!isObject(candidate)) return { ok: false, message: "Uma sugestão é inválida." };
    const expected = ["insight_type", "title", "statement", "memory_refs", "evidence_refs", "caveat"];
    if (Object.keys(candidate).some((key) => !expected.includes(key))) return { ok: false, message: "Uma sugestão contém campos não permitidos." };
    if (!isStringArrayMember(candidate.insight_type, INSIGHT_TYPES)) return { ok: false, message: "Tipo de insight inválido." };
    if (typeof candidate.title !== "string" || !candidate.title.trim() || Array.from(candidate.title).length > 200) return { ok: false, message: "Título de insight inválido." };
    if (typeof candidate.statement !== "string" || !candidate.statement.trim() || Array.from(candidate.statement).length > 12000) return { ok: false, message: "Interpretação inválida." };
    if (typeof candidate.caveat !== "string" || Array.from(candidate.caveat).length > 1000) return { ok: false, message: "Ressalva inválida." };
    if (!Array.isArray(candidate.memory_refs) || candidate.memory_refs.length > 12 || !candidate.memory_refs.every((ref) => validateReference(ref, allowedMemoryIds))) return { ok: false, message: "A sugestão referencia uma memória fora do contexto permitido." };
    if (!Array.isArray(candidate.evidence_refs) || candidate.evidence_refs.length > 20 || !candidate.evidence_refs.every((ref) => validateReference(ref, allowedEvidenceIds))) return { ok: false, message: "A sugestão referencia uma evidência fora do contexto permitido." };

    suggestions.push({
      insight_type: candidate.insight_type,
      title: candidate.title.trim(),
      statement: candidate.statement.trim(),
      memory_refs: candidate.memory_refs as BrainAIReference[],
      evidence_refs: candidate.evidence_refs as BrainAIReference[],
      caveat: candidate.caveat.trim(),
    });
  }

  return { ok: true, value: { suggestions } };
}
