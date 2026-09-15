import { revalidatePath } from "next/cache";
import { fileApiAccess, privateJson } from "@/lib/files/server";
import { FILE_BUCKET, MAX_FILE_BYTES, buildFileKey, fileDigest, isUploadId, validateFileBytes } from "@/lib/files/validation";

export const runtime = "nodejs";
export const maxDuration = 30;

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site";
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ message: "Origem da solicitação inválida." }, 403);
  const access = await fileApiAccess();
  if (!access.ok) return access.response;
  const declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > MAX_FILE_BYTES + 100_000) {
    return privateJson({ message: "Envio acima do limite. Escolha um arquivo de até 2 MB." }, 413);
  }
  try {
    const form = await request.formData();
    const file = form.get("file");
    const requestId = form.get("requestId");
    if (!(file instanceof File) || form.getAll("file").length !== 1 || !isUploadId(requestId)) {
      return privateJson({ message: "Selecione um único arquivo e tente novamente." }, 400);
    }
    if (file.size < 1 || file.size > MAX_FILE_BYTES) return privateJson({ message: "O arquivo deve ter conteúdo e no máximo 2 MB." }, 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validateFileBytes(file.name, bytes);
    if (!validation.ok) return privateJson({ message: validation.message }, 422);
    const digest = await fileDigest(bytes);
    const key = buildFileKey(requestId, digest, file.name);
    const path = `${access.user.id}/${key}`;
    const bucket = access.supabase.storage.from(FILE_BUCKET);
    const { error } = await bucket.upload(path, bytes, {
      contentType: validation.contentType,
      cacheControl: "0",
      upsert: false,
    });
    if (error) {
      const existing = await bucket.download(path);
      if (existing.error || !existing.data) return privateJson({ message: "Não foi possível confirmar o envio. Tente novamente." }, 503);
      const existingBytes = new Uint8Array(await existing.data.arrayBuffer());
      if (existingBytes.byteLength !== bytes.byteLength || await fileDigest(existingBytes) !== digest) {
        return privateJson({ message: "Já existe um objeto diferente para esta tentativa. Nenhum original foi substituído." }, 409);
      }
    }
    revalidatePath("/biblioteca/arquivos");
    return privateJson({ ok: true, key }, 201);
  } catch {
    return privateJson({ message: "Não foi possível concluir o envio. Verifique o arquivo e a conexão." }, 400);
  }
}
