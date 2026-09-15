import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { FILE_BUCKET, FILE_PAGE_SIZE, parseFileKey } from "./validation";

export function filesEnabled(): boolean {
  return process.env.PRIVATE_FILES_ENABLED === "true";
}

export function privateJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function fileApiAccess() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { ok: false as const, response: privateJson({ message: "Entre novamente para acessar seus arquivos." }, 401) };
    if (!filesEnabled()) return { ok: false as const, response: privateJson({ message: "O armazenamento de arquivos ainda não foi ativado neste ambiente." }, 503) };
    return { ok: true as const, supabase, user: data.user };
  } catch {
    return { ok: false as const, response: privateJson({ message: "Não foi possível validar o acesso aos arquivos." }, 503) };
  }
}

export type LibraryFile = { key: string; name: string; size: number | null; createdAt: string | null };
export type FilesResult =
  | { status: "ready"; files: LibraryFile[]; hasNext: boolean; unknownFiles: boolean }
  | { status: "disabled" | "error" };

export async function getFiles(page: number): Promise<FilesResult> {
  const { supabase, user } = await requireUser();
  if (!filesEnabled()) return { status: "disabled" };
  try {
    const { data, error } = await supabase.storage.from(FILE_BUCKET).list(user.id, {
      limit: FILE_PAGE_SIZE + 1,
      offset: (page - 1) * FILE_PAGE_SIZE,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error || !data) return { status: "error" };
    let unknownFiles = false;
    const files: LibraryFile[] = [];
    for (const item of data.slice(0, FILE_PAGE_SIZE)) {
      const parsed = parseFileKey(item.name);
      if (!parsed || !item.id) { unknownFiles = true; continue; }
      files.push({
        key: item.name,
        name: parsed.originalName,
        size: typeof item.metadata?.size === "number" ? item.metadata.size : null,
        createdAt: item.created_at ?? null,
      });
    }
    return { status: "ready", files, hasNext: data.length > FILE_PAGE_SIZE, unknownFiles };
  } catch {
    return { status: "error" };
  }
}
