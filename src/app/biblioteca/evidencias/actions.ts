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

export async function saveEvidence(formData: FormData): Promise<void> {
  const key = formData.get("key");
  const kind = formData.get("kind");
  const index = readIndex(formData.get("index"));
  if (typeof key !== "string" || !parseFileKey(key) || (kind !== "page" && kind !== "chunk") || index === null) {
    redirect("/biblioteca/evidencias?status=invalida");
  }

  const { supabase, user } = await requireUser();
  const { data: document } = await supabase.from("library_documents")
    .select("id,file_name,storage_key")
    .eq("user_id", user.id)
    .eq("storage_key", key)
    .maybeSingle();
  if (!document) redirect(`/biblioteca/arquivos/${encodeURIComponent(key)}?evidencia=indisponivel`);

  let excerpt = "";
  let sourceLabel = "";
  let pageNumber: number | null = null;
  let chunkIndex: number | null = null;

  if (kind === "page") {
    if (index < 1) redirect(`/biblioteca/arquivos/${encodeURIComponent(key)}?evidencia=invalida`);
    const { data: page } = await supabase.from("library_document_pages")
      .select("page_number,content")
      .eq("document_id", document.id)
      .eq("user_id", user.id)
      .eq("page_number", index)
      .maybeSingle();
    if (!page?.content) redirect(`/biblioteca/arquivos/${encodeURIComponent(key)}?evidencia=indisponivel`);
    excerpt = page.content;
    pageNumber = page.page_number;
    sourceLabel = `${document.file_name} · Página ${page.page_number}`;
  } else {
    const { data: chunk } = await supabase.from("library_document_chunks")
      .select("chunk_index,label,content")
      .eq("document_id", document.id)
      .eq("user_id", user.id)
      .eq("chunk_index", index)
      .maybeSingle();
    if (!chunk?.content) redirect(`/biblioteca/arquivos/${encodeURIComponent(key)}?evidencia=indisponivel`);
    excerpt = chunk.content;
    chunkIndex = chunk.chunk_index;
    sourceLabel = `${document.file_name} · ${chunk.label ?? `Parte ${chunk.chunk_index + 1}`}`;
  }

  if (Array.from(excerpt).length > 20_000) redirect(`/biblioteca/arquivos/${encodeURIComponent(key)}?evidencia=grande`);

  const { error } = await supabase.from("library_evidence").insert({
    user_id: user.id,
    document_id: document.id,
    source_kind: kind,
    page_number: pageNumber,
    chunk_index: chunkIndex,
    source_label: sourceLabel,
    excerpt,
  });
  if (error) redirect(`/biblioteca/arquivos/${encodeURIComponent(key)}?evidencia=erro`);

  revalidatePath("/biblioteca/evidencias");
  redirect(`/biblioteca/arquivos/${encodeURIComponent(key)}?evidencia=salva`);
}
