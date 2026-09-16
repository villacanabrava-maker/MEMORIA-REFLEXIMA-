import { fileApiAccess, privateJson } from "@/lib/files/server";
import { extractPdfBatchFromUrl, PDF_BATCH_SIZE } from "@/lib/files/pdf";
import { FILE_BUCKET, parseFileKey } from "@/lib/files/validation";

type Context = { params: Promise<{ key: string }> };

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site";
}

export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request)) return privateJson({ message: "Origem da solicitação inválida." }, 403);
  const access = await fileApiAccess();
  if (!access.ok) return access.response;

  const { key } = await context.params;
  const parsed = parseFileKey(key);
  if (!parsed || !/\.pdf$/i.test(parsed.originalName)) return privateJson({ message: "Este processamento é exclusivo para PDF." }, 400);

  const path = `${access.user.id}/${key}`;
  const { data: listed, error: listError } = await access.supabase.storage.from(FILE_BUCKET).list(access.user.id, { limit: 10, search: key });
  const exact = listed?.find((item) => item.name === key && item.id);
  if (listError || !exact) return privateJson({ message: "PDF não encontrado na sua área privada." }, 404);

  let { data: document, error: documentError } = await access.supabase
    .from("library_documents")
    .select("id,status,total_pages,processed_pages")
    .eq("user_id", access.user.id)
    .eq("storage_key", key)
    .maybeSingle();

  if (documentError) return privateJson({ message: "Não foi possível consultar o progresso do documento." }, 503);
  if (!document) {
    const inserted = await access.supabase.from("library_documents").insert({
      user_id: access.user.id,
      storage_key: key,
      file_name: parsed.originalName,
      status: "pending",
    }).select("id,status,total_pages,processed_pages").single();
    if (inserted.error || !inserted.data) return privateJson({ message: "Não foi possível iniciar o processamento do PDF." }, 503);
    document = inserted.data;
  }

  if (document.status === "completed" || document.status === "needs_ocr") {
    return privateJson({ status: document.status, totalPages: document.total_pages, processedPages: document.processed_pages, done: true });
  }

  const startPage = Math.max(1, (document.processed_pages ?? 0) + 1);
  try {
    await access.supabase.from("library_documents").update({ status: "processing", last_error: null }).eq("id", document.id);
    const { data: signed, error: signedError } = await access.supabase.storage.from(FILE_BUCKET).createSignedUrl(path, 90);
    if (signedError || !signed?.signedUrl) throw new Error("SIGNED_URL");

    const batch = await extractPdfBatchFromUrl(signed.signedUrl, startPage, PDF_BATCH_SIZE);
    const pageRows = batch.pages.map((page) => ({
      document_id: document.id,
      user_id: access.user.id,
      page_number: page.pageNumber,
      content: page.content,
      character_count: page.characterCount,
    }));
    if (pageRows.length) {
      const { error: pageError } = await access.supabase.from("library_document_pages").upsert(pageRows, { onConflict: "document_id,page_number" });
      if (pageError) throw new Error("SAVE_PAGES");
    }

    const completed = batch.endPage >= batch.totalPages;
    let finalStatus: "processing" | "completed" | "needs_ocr" = completed ? "completed" : "processing";
    if (completed) {
      const { data: counts, error: countError } = await access.supabase
        .from("library_document_pages")
        .select("character_count")
        .eq("document_id", document.id);
      if (countError) throw new Error("COUNT_TEXT");
      const totalCharacters = (counts ?? []).reduce((sum, row) => sum + (row.character_count ?? 0), 0);
      if (totalCharacters === 0) finalStatus = "needs_ocr";
    }

    const { error: updateError } = await access.supabase.from("library_documents").update({
      status: finalStatus,
      total_pages: batch.totalPages,
      processed_pages: batch.endPage,
      last_error: null,
    }).eq("id", document.id);
    if (updateError) throw new Error("SAVE_PROGRESS");

    return privateJson({
      status: finalStatus,
      totalPages: batch.totalPages,
      processedPages: batch.endPage,
      batchStart: batch.startPage,
      batchEnd: batch.endPage,
      done: completed,
    });
  } catch (error) {
    const message = error instanceof Error && error.message === "PDF_TIMEOUT"
      ? "Um lote demorou mais do que o limite seguro. Você pode retomar sem perder as páginas já concluídas."
      : error instanceof Error && error.message === "PDF_PAGE_TOO_LARGE"
        ? "Uma página possui conteúdo excessivamente grande para processamento seguro."
        : "O processamento deste lote foi interrompido. As páginas já concluídas continuam salvas.";
    await access.supabase.from("library_documents").update({ status: "error", last_error: message }).eq("id", document.id);
    return privateJson({ message, retryable: true, processedPages: document.processed_pages ?? 0 }, 503);
  }
}
