import { fileApiAccess, privateJson } from "@/lib/files/server";
import { parseFileKey } from "@/lib/files/validation";

type Context = { params: Promise<{ key: string }> };

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site";
}

export async function GET(_request: Request, context: Context) {
  const access = await fileApiAccess(); if (!access.ok) return access.response;
  const { key } = await context.params; const parsed = parseFileKey(key);
  if (!parsed) return privateJson({ message: "Arquivo inválido." }, 400);

  const { data: document, error } = await access.supabase.from("library_documents")
    .select("status,total_pages,processed_pages,processed_bytes,file_size,processor_strategy,last_error")
    .eq("user_id", access.user.id).eq("storage_key", key).maybeSingle();
  if (error) return privateJson({ message: "Não foi possível consultar o processamento." }, 503);
  if (!document) return privateJson({ status: "not_started", strategy: null, totalPages: null, processedPages: 0, processedBytes: 0, fileSize: null, lastError: null, pagePreview: [], chunkPreview: [], hasMorePreview: false });
  return privateJson({
    status: document.status,
    strategy: document.processor_strategy,
    totalPages: document.total_pages,
    processedPages: document.processed_pages ?? 0,
    processedBytes: Number(document.processed_bytes ?? 0),
    fileSize: document.file_size === null ? null : Number(document.file_size),
    lastError: document.last_error,
    pagePreview: [], chunkPreview: [], hasMorePreview: false,
  });
}

export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request)) return privateJson({ message: "Origem da solicitação inválida." }, 403);
  const access = await fileApiAccess(); if (!access.ok) return access.response;
  const { key } = await context.params; const parsed = parseFileKey(key);
  if (!parsed) return privateJson({ message: "Arquivo inválido." }, 400);

  const { data: listed, error: listError } = await access.supabase.storage.from("library-originals-v1").list(access.user.id, { limit: 10, search: key });
  const exact = listed?.find((item) => item.name === key && item.id);
  if (listError || !exact) return privateJson({ message: "Arquivo não encontrado na sua área privada." }, 404);
  const size = typeof exact.metadata?.size === "number" ? exact.metadata.size : null;

  const { data, error } = await access.supabase.rpc("enqueue_library_file_processing", {
    p_storage_key: key,
    p_file_name: parsed.originalName,
    p_mime_type: typeof exact.metadata?.mimetype === "string" ? exact.metadata.mimetype : null,
    p_file_size: size,
    p_force: true,
  });
  if (error) return privateJson({ message: "Não foi possível colocar o arquivo novamente na fila." }, 503);
  return privateJson({ ok: true, documentId: data, status: "queued" });
}
