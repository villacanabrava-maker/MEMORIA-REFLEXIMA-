import { revalidatePath } from "next/cache";
import { fileApiAccess, privateJson } from "@/lib/files/server";
import { FILE_BUCKET, parseFileKey } from "@/lib/files/validation";

type Context = { params: Promise<{ key: string }> };
function sameOrigin(request: Request): boolean { const origin = request.headers.get("origin"); return origin === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site"; }

export async function GET(_request: Request, context: Context) {
  const access = await fileApiAccess(); if (!access.ok) return access.response;
  const { key } = await context.params; const parsed = parseFileKey(key); if (!parsed) return privateJson({ message: "Arquivo não encontrado." }, 404);
  const path = `${access.user.id}/${key}`;
  const { data, error } = await access.supabase.storage.from(FILE_BUCKET).createSignedUrl(path, 60, { download: true });
  if (error || !data?.signedUrl) return privateJson({ message: "Não foi possível preparar o download." }, 404);
  return Response.redirect(data.signedUrl, 302);
}

export async function DELETE(request: Request, context: Context) {
  if (!sameOrigin(request)) return privateJson({ message: "Origem da solicitação inválida." }, 403);
  const access = await fileApiAccess(); if (!access.ok) return access.response;
  const { key } = await context.params; if (!parseFileKey(key)) return privateJson({ message: "Arquivo não encontrado." }, 404);
  let confirmation = "";
  try { const body = await request.json() as { confirmation?: unknown }; confirmation = typeof body.confirmation === "string" ? body.confirmation : ""; } catch { return privateJson({ message: "Confirmação de exclusão inválida." }, 400); }
  if (confirmation !== "excluir") return privateJson({ message: "Confirme a exclusão do original." }, 400);
  const { error } = await access.supabase.storage.from(FILE_BUCKET).remove([`${access.user.id}/${key}`]);
  if (error) return privateJson({ message: "Não foi possível confirmar a exclusão. Recarregue a lista antes de repetir." }, 503);
  revalidatePath("/biblioteca");
  revalidatePath("/biblioteca/arquivos");
  return privateJson({ ok: true });
}
