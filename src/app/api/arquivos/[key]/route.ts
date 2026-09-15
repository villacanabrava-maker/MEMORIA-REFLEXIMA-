import { revalidatePath } from "next/cache";
import { fileApiAccess, privateJson } from "@/lib/files/server";
import { FILE_BUCKET, MAX_FILE_BYTES, attachmentHeader, fileDigest, parseFileKey } from "@/lib/files/validation";

export const runtime = "nodejs";
export const maxDuration = 30;
type Context = { params: Promise<{ key: string }> };

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site";
}

export async function GET(_request: Request, context: Context) {
  const access = await fileApiAccess();
  if (!access.ok) return access.response;
  const { key } = await context.params;
  const parsed = parseFileKey(key);
  if (!parsed) return privateJson({ message: "Arquivo não encontrado." }, 404);
  try {
    const { data, error } = await access.supabase.storage.from(FILE_BUCKET).download(`${access.user.id}/${key}`);
    if (error || !data) return privateJson({ message: "Não foi possível abrir o arquivo." }, 404);
    if (data.size < 1 || data.size > MAX_FILE_BYTES) return privateJson({ message: "O original não corresponde aos limites desta versão." }, 422);
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (await fileDigest(bytes) !== parsed.digest) return privateJson({ message: "A verificação de integridade falhou. O download foi interrompido." }, 409);
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": attachmentHeader(parsed.originalName),
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
        "Content-Security-Policy": "sandbox; default-src 'none'",
      },
    });
  } catch {
    return privateJson({ message: "O download foi interrompido. Tente novamente." }, 503);
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!sameOrigin(request)) return privateJson({ message: "Origem da solicitação inválida." }, 403);
  const access = await fileApiAccess();
  if (!access.ok) return access.response;
  const { key } = await context.params;
  if (!parseFileKey(key)) return privateJson({ message: "Arquivo não encontrado." }, 404);
  let confirmation = "";
  try {
    const body = await request.json() as { confirmation?: unknown };
    confirmation = typeof body.confirmation === "string" ? body.confirmation : "";
  } catch {
    return privateJson({ message: "Confirmação de exclusão inválida." }, 400);
  }
  if (confirmation !== "excluir") return privateJson({ message: "Confirme a exclusão do original." }, 400);
  try {
    const { error } = await access.supabase.storage.from(FILE_BUCKET).remove([`${access.user.id}/${key}`]);
    if (error) return privateJson({ message: "Não foi possível confirmar a exclusão. Recarregue a lista antes de repetir." }, 503);
    revalidatePath("/biblioteca/arquivos");
    return privateJson({ ok: true });
  } catch {
    return privateJson({ message: "A conexão foi interrompida. Recarregue a lista para conferir o resultado." }, 503);
  }
}
