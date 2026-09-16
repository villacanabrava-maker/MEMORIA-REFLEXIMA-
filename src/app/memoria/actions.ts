"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { isMemoryId, validateMemory, type MemoryFormState } from "@/lib/memory/validation";
import { isVersion } from "@/lib/sources/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function saveMemory(previous: MemoryFormState, formData: FormData): Promise<MemoryFormState> {
  void previous;
  const validation = validateMemory(formData);
  if (!validation.ok) return { message: "Revise os campos indicados.", errors: validation.errors };

  const { supabase, user } = await requireUser();
  const id = formData.get("id");
  const version = formData.get("version");
  const evidenceIdRaw = formData.get("evidence_id");
  const evidenceId = typeof evidenceIdRaw === "string" && UUID.test(evidenceIdRaw) ? evidenceIdRaw : null;

  let memoryId: string;
  try {
    if (id !== null) {
      if (!isMemoryId(id) || !isVersion(version)) return { message: "Não foi possível identificar a versão desta memória." };
      const { data, error } = await supabase
        .from("memory_nodes")
        .update(validation.value)
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("updated_at", version)
        .select("id")
        .maybeSingle();
      if (error) return { message: "Não foi possível salvar esta memória agora." };
      if (!data) return { message: "A memória mudou em outra aba. Reabra a versão atual antes de salvar." };
      memoryId = data.id;
    } else {
      const { data, error } = await supabase.from("memory_nodes").insert(validation.value).select("id").single();
      if (error || !data) return { message: "Não foi possível criar esta memória agora." };
      memoryId = data.id;
    }

    if (evidenceId) {
      const { error: linkError } = await supabase.from("memory_evidence").upsert({
        memory_id: memoryId,
        evidence_id: evidenceId,
        role: "supports",
      }, { onConflict: "memory_id,evidence_id" });
      if (linkError) return { message: "A memória foi salva, mas a evidência não pôde ser vinculada. Você poderá ligá-la depois." };
    }
  } catch {
    return { message: "A conexão foi interrompida. Confira Minha Memória antes de repetir a operação." };
  }

  revalidatePath("/");
  revalidatePath("/memoria");
  revalidatePath(`/memoria/${memoryId}`);
  redirect(`/memoria/${memoryId}`);
}
