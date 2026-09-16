"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { parseFileKey } from "@/lib/files/validation";

function readIndex(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function readOptionalOffset(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  return readIndex(value);
}

export async function saveEvidence(formData: FormData): Promise<void> {
  const key = formData.get("key");
  const kind = formData.get("kind");
  const index = readIndex(formData.get("index"));
  const startOffset = readOptionalOffset(formData.get("start_offset"));
  const endOffset = readOptionalOffset(formData.get("end_offset"));

  if (
    typeof key !== "string" ||
    !parseFileKey(key) ||
    (kind !== "page" && kind !== "chunk") ||
    index === null ||
    ((startOffset === null) !== (endOffset === null)) ||
    (startOffset !== null && endOffset !== null && endOffset <= startOffset)
  ) {
    redirect("/biblioteca/evidencias?status=invalida");
  }

  const { supabase, user } = await requireUser();
  const { data: document, error: documentError } = await supabase
    .from("library_documents")
    .select("id")
    .eq("user_id", user.id)
    .eq("storage_key", key)
    .maybeSingle();

  if (documentError || !document) redirect(`/biblioteca/arquivos/${encodeURIComponent(key)}?evidencia=indisponivel`);

  const { error } = await supabase.rpc("save_library_evidence", {
    p_document_id: document.id,
    p_source_kind: kind,
    p_index: index,
    p_start_offset: startOffset,
    p_end_offset: endOffset,
    p_note: null,
  });

  if (error) {
    const status = /too large|span too large/i.test(error.message) ? "grande" : "erro";
    redirect(`/biblioteca/arquivos/${encodeURIComponent(key)}?evidencia=${status}`);
  }

  revalidatePath("/biblioteca/evidencias");
  redirect(`/biblioteca/arquivos/${encodeURIComponent(key)}?evidencia=salva`);
}
