"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { libraryEnabled } from "@/lib/sources/data";
import { isSourceId, isVersion, validateSource, type FormState } from "@/lib/sources/validation";

export async function saveSource(previous: FormState, formData: FormData): Promise<FormState> {
  void previous;
  const { supabase, user } = await requireUser();
  if (!libraryEnabled()) return { message: "O armazenamento de textos ainda não foi ativado neste ambiente." };
  const validation = validateSource(formData.get("title"), formData.get("content"));
  if (!validation.ok) return { message: "Revise os campos indicados. Seu texto foi mantido no formulário.", errors: validation.errors };
  const id = formData.get("id");
  const version = formData.get("version");
  if (id !== null && (!isSourceId(id) || !isVersion(version))) return { message: "Não foi possível identificar esta versão do texto. Reabra o conteúdo antes de salvar." };
  let savedId: string;
  try {
    if (id !== null) {
      const { data, error } = await supabase.from("sources")
        .update(validation.value).eq("id", id).eq("user_id", user.id)
        .eq("updated_at", version as string).select("id").maybeSingle();
      if (error) return { message: "Não foi possível salvar. Seu texto permanece no formulário; tente novamente." };
      if (!data) return { message: "O texto foi alterado, excluído ou não está disponível. Copie suas alterações e reabra a versão atual antes de salvar." };
      savedId = data.id as string;
    } else {
      // Ownership comes from auth.uid() in PostgreSQL, never from a browser field.
      const { data, error } = await supabase.from("sources").insert(validation.value).select("id").single();
      if (error || !data) return { message: "Não foi possível salvar. Seu texto permanece no formulário; tente novamente." };
      savedId = data.id as string;
    }
  } catch {
    return { message: "A conexão foi interrompida. Confira a biblioteca antes de repetir o envio, pois a gravação pode ter sido concluída." };
  }
  revalidatePath("/");
  revalidatePath("/biblioteca");
  revalidatePath(`/biblioteca/${savedId}`);
  redirect(`/biblioteca/${savedId}`);
}

export async function deleteSource(previous: FormState, formData: FormData): Promise<FormState> {
  void previous;
  const { supabase, user } = await requireUser();
  if (!libraryEnabled()) return { message: "O armazenamento de textos ainda não foi ativado neste ambiente." };
  const id = formData.get("id");
  const version = formData.get("version");
  if (!isSourceId(id) || !isVersion(version) || formData.get("confirmation") !== "excluir") return { message: "Confirme a exclusão desta versão do texto antes de continuar." };
  try {
    const { data, error } = await supabase.from("sources").delete()
      .eq("id", id).eq("user_id", user.id).eq("updated_at", version)
      .select("id").maybeSingle();
    if (error) return { message: "Não foi possível excluir. Atualize a página antes de tentar novamente." };
    if (!data) return { message: "O texto foi alterado, excluído ou não está disponível. Atualize a página antes de continuar." };
  } catch {
    return { message: "A conexão foi interrompida. Confira a biblioteca para verificar se a exclusão foi concluída." };
  }
  revalidatePath("/");
  revalidatePath("/biblioteca");
  revalidatePath(`/biblioteca/${id}`);
  redirect("/biblioteca");
}
