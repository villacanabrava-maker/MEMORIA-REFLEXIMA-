"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { isCatalogId } from "@/lib/library/catalog";
import { validateCatalogMetadata, type CatalogMetadataFormState } from "@/lib/library/metadata";
import { isVersion } from "@/lib/sources/validation";

export async function saveCatalogMetadata(previous: CatalogMetadataFormState, formData: FormData): Promise<CatalogMetadataFormState> {
  void previous;
  const id = formData.get("id");
  const version = formData.get("version");
  if (!isCatalogId(id) || !isVersion(version)) return { message: "Este item mudou ou não pôde ser identificado. Reabra a organização antes de salvar." };

  const validation = validateCatalogMetadata(formData);
  if (!validation.ok) return { message: "Revise os campos indicados. Nenhum dado original foi alterado.", errors: validation.errors };

  const { supabase, user } = await requireUser();
  try {
    const { data, error } = await supabase
      .from("library_items")
      .update(validation.value)
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("updated_at", version)
      .select("id")
      .maybeSingle();

    if (error) return { message: "Não foi possível salvar a organização agora. O arquivo ou texto original continua intacto." };
    if (!data) return { message: "Este item foi alterado em outra aba. Reabra a versão atual antes de salvar novamente." };
  } catch {
    return { message: "A conexão foi interrompida. Confira a Biblioteca antes de repetir a operação." };
  }

  revalidatePath("/");
  revalidatePath("/biblioteca");
  revalidatePath(`/biblioteca/catalogo/${id}`);
  redirect("/biblioteca");
}
