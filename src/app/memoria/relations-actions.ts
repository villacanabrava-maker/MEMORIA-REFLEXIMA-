"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { isMemoryId } from "@/lib/memory/validation";
import { MEMORY_RELATION_TYPES } from "@/lib/memory/relations";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function addMemoryRelation(formData: FormData): Promise<void> {
  const fromId = formData.get("from_memory_id");
  const toId = formData.get("to_memory_id");
  const relationType = formData.get("relation_type");
  const noteRaw = formData.get("note");
  const note = typeof noteRaw === "string" ? noteRaw.trim().slice(0, 2000) : "";
  const allowed = MEMORY_RELATION_TYPES.map(([value]) => value) as readonly string[];

  if (!isMemoryId(fromId) || !isMemoryId(toId) || fromId === toId || typeof relationType !== "string" || !allowed.includes(relationType)) {
    redirect("/memoria?relacao=invalida");
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.from("memory_relations").insert({
    from_memory_id: fromId,
    to_memory_id: toId,
    relation_type: relationType,
    note: note || null,
  });

  revalidatePath("/memoria");
  revalidatePath(`/memoria/${fromId}`);
  if (error) redirect(`/memoria/${fromId}?relacao=erro`);
  redirect(`/memoria/${fromId}?relacao=salva`);
}

export async function deleteMemoryRelation(formData: FormData): Promise<void> {
  const relationId = formData.get("relation_id");
  const memoryId = formData.get("memory_id");
  if (typeof relationId !== "string" || !UUID.test(relationId) || !isMemoryId(memoryId)) redirect("/memoria");

  const { supabase, user } = await requireUser();
  await supabase.from("memory_relations").delete().eq("id", relationId).eq("user_id", user.id);
  revalidatePath(`/memoria/${memoryId}`);
  redirect(`/memoria/${memoryId}`);
}
