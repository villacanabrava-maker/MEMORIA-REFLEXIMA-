export const MEMORY_TYPES = [
  ["concept", "Conceito"],
  ["theme", "Tema"],
  ["experience", "Experiência"],
  ["person", "Pessoa"],
  ["event", "Acontecimento"],
  ["story", "História"],
  ["pattern", "Padrão"],
  ["idea", "Ideia"],
] as const;

export const MEMORY_STATUSES = [
  ["draft", "Rascunho"],
  ["confirmed", "Confirmada por mim"],
  ["archived", "Arquivada"],
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number][0];
export type MemoryStatus = (typeof MEMORY_STATUSES)[number][0];
export type MemoryFormState = { message: string; errors?: Partial<Record<"title" | "node_type" | "reflection" | "status", string>> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isMemoryId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateMemory(formData: FormData) {
  const errors: NonNullable<MemoryFormState["errors"]> = {};
  const title = text(formData.get("title"));
  const nodeType = text(formData.get("node_type"));
  const reflection = text(formData.get("reflection"));
  const status = text(formData.get("status"));

  if (!title) errors.title = "Dê um nome para esta memória.";
  else if (Array.from(title).length > 200) errors.title = "Use no máximo 200 caracteres.";

  if (!(MEMORY_TYPES.map(([value]) => value) as readonly string[]).includes(nodeType)) errors.node_type = "Escolha um tipo válido.";
  if (Array.from(reflection).length > 10_000) errors.reflection = "Use no máximo 10.000 caracteres.";
  if (!(MEMORY_STATUSES.map(([value]) => value) as readonly string[]).includes(status)) errors.status = "Escolha um estado válido.";

  if (Object.keys(errors).length) return { ok: false as const, errors };
  return { ok: true as const, value: { title, node_type: nodeType as MemoryType, reflection: reflection || null, status: status as MemoryStatus } };
}

export function memoryTypeLabel(value: MemoryType): string {
  return MEMORY_TYPES.find(([type]) => type === value)?.[1] ?? value;
}
