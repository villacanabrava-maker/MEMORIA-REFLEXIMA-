import "server-only";
import { requireUser } from "@/lib/auth/require-user";
import { isMemoryId } from "./validation";

export const MEMORY_RELATION_TYPES = [
  ["related_to", "Relacionada a"],
  ["contrasts_with", "Contrasta com"],
  ["evolved_from", "Evoluiu de"],
  ["supports", "Reforça"],
  ["part_of", "Faz parte de"],
  ["example_of", "É exemplo de"],
  ["influences", "Influencia"],
] as const;

export type MemoryRelationType = (typeof MEMORY_RELATION_TYPES)[number][0];

export type MemoryRelation = {
  id: string;
  type: MemoryRelationType;
  note: string | null;
  direction: "outgoing" | "incoming";
  otherId: string;
  otherTitle: string;
};

export function relationLabel(type: MemoryRelationType, direction: "outgoing" | "incoming"): string {
  if (direction === "outgoing") return MEMORY_RELATION_TYPES.find(([value]) => value === type)?.[1] ?? type;
  return ({
    related_to: "Relacionada a",
    contrasts_with: "Contrasta com",
    evolved_from: "Deu origem a",
    supports: "É reforçada por",
    part_of: "Contém",
    example_of: "Tem como exemplo",
    influences: "É influenciada por",
  } satisfies Record<MemoryRelationType, string>)[type];
}

export async function listRelationTargets(excludeId: string): Promise<Array<{ id: string; title: string }> | null> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("memory_nodes")
    .select("id,title")
    .eq("user_id", user.id)
    .neq("id", excludeId)
    .neq("status", "archived")
    .order("title", { ascending: true })
    .limit(200);
  return error ? null : (data ?? []);
}

export async function getMemoryRelations(memoryId: string): Promise<MemoryRelation[] | null> {
  if (!isMemoryId(memoryId)) return null;
  const { supabase, user } = await requireUser();
  const { data: relations, error } = await supabase
    .from("memory_relations")
    .select("id,from_memory_id,to_memory_id,relation_type,note")
    .eq("user_id", user.id)
    .or(`from_memory_id.eq.${memoryId},to_memory_id.eq.${memoryId}`)
    .order("created_at", { ascending: true });
  if (error) return null;

  const otherIds = [...new Set((relations ?? []).map((relation) => relation.from_memory_id === memoryId ? relation.to_memory_id : relation.from_memory_id))];
  const titles = new Map<string, string>();
  if (otherIds.length) {
    const { data: memories, error: memoriesError } = await supabase
      .from("memory_nodes")
      .select("id,title")
      .eq("user_id", user.id)
      .in("id", otherIds);
    if (memoriesError) return null;
    for (const memory of memories ?? []) titles.set(memory.id, memory.title);
  }

  return (relations ?? []).flatMap((relation) => {
    const direction = relation.from_memory_id === memoryId ? "outgoing" as const : "incoming" as const;
    const otherId = direction === "outgoing" ? relation.to_memory_id : relation.from_memory_id;
    const otherTitle = titles.get(otherId);
    if (!otherTitle) return [];
    return [{
      id: relation.id,
      type: relation.relation_type as MemoryRelationType,
      note: relation.note,
      direction,
      otherId,
      otherTitle,
    }];
  });
}
