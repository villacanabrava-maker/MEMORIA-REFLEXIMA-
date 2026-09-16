export const CONTRACT_VERSION = "brain-insight-v1";
export const INSIGHT_TYPES = ["writing_style","theme","concept","thinking_pattern","story_pattern","evolution","tension","other"] as const;
export const SUPPORT_ROLES = ["supports","context","contrasts","example"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const suggestionSchema = {
  type: "object", additionalProperties: false, required: ["suggestions"],
  properties: { suggestions: { type: "array", maxItems: 5, items: {
    type: "object", additionalProperties: false,
    required: ["insight_type","title","statement","memory_refs","evidence_refs","caveat"],
    properties: {
      insight_type: { type: "string", enum: [...INSIGHT_TYPES] },
      title: { type: "string", minLength: 1, maxLength: 200 },
      statement: { type: "string", minLength: 1, maxLength: 12000 },
      memory_refs: { type: "array", maxItems: 12, items: { type: "object", additionalProperties: false, required: ["id","role"], properties: { id: { type: "string" }, role: { type: "string", enum: [...SUPPORT_ROLES] } } } },
      evidence_refs: { type: "array", maxItems: 20, items: { type: "object", additionalProperties: false, required: ["id","role"], properties: { id: { type: "string" }, role: { type: "string", enum: [...SUPPORT_ROLES] } } } },
      caveat: { type: "string", maxLength: 1000 }
    }
  } } }
} as const;
export type Ref = { id: string; role: typeof SUPPORT_ROLES[number] };
export type Suggestion = { insight_type: typeof INSIGHT_TYPES[number]; title: string; statement: string; memory_refs: Ref[]; evidence_refs: Ref[]; caveat: string };
function obj(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function member(v: unknown, a: readonly string[]) { return typeof v === "string" && a.includes(v); }
function ref(v: unknown, allowed: Set<string>): v is Ref { return obj(v) && Object.keys(v).every((k) => k === "id" || k === "role") && typeof v.id === "string" && UUID.test(v.id) && allowed.has(v.id) && member(v.role, SUPPORT_ROLES); }
export function validateSuggestions(value: unknown, memories: Set<string>, evidence: Set<string>): Suggestion[] | null {
  if (!obj(value) || Object.keys(value).some((k) => k !== "suggestions") || !Array.isArray(value.suggestions) || value.suggestions.length > 5) return null;
  const out: Suggestion[] = [];
  for (const item of value.suggestions) {
    if (!obj(item) || Object.keys(item).some((k) => !["insight_type","title","statement","memory_refs","evidence_refs","caveat"].includes(k))) return null;
    if (!member(item.insight_type, INSIGHT_TYPES) || typeof item.title !== "string" || !item.title.trim() || Array.from(item.title).length > 200 || typeof item.statement !== "string" || !item.statement.trim() || Array.from(item.statement).length > 12000 || typeof item.caveat !== "string" || Array.from(item.caveat).length > 1000) return null;
    if (!Array.isArray(item.memory_refs) || item.memory_refs.length > 12 || !item.memory_refs.every((r) => ref(r, memories))) return null;
    if (!Array.isArray(item.evidence_refs) || item.evidence_refs.length > 20 || !item.evidence_refs.every((r) => ref(r, evidence))) return null;
    out.push({ insight_type: item.insight_type as Suggestion["insight_type"], title: item.title.trim(), statement: item.statement.trim(), memory_refs: item.memory_refs as Ref[], evidence_refs: item.evidence_refs as Ref[], caveat: item.caveat.trim() });
  }
  return out;
}
