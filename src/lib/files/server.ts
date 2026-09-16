import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { decodeTextFile, MAX_IMPORT_BYTES, type SourceInput } from "@/lib/sources/validation";
import { extractDocxText, MAX_DOCX_PROCESS_BYTES } from "./docx";
import { extractPdfText, MAX_PDF_PROCESS_BYTES } from "./pdf";
import { FILE_BUCKET, FILE_PAGE_SIZE, parseFileKey } from "./validation";

export function filesEnabled(): boolean {
  const configured = process.env.PRIVATE_FILES_ENABLED;
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.VERCEL_ENV === "preview";
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

function toLibraryFile(item: { name: string; id?: string | null; metadata?: Record<string, unknown> | null; created_at?: string | null }): LibraryFile | null {
  const parsed = parseFileKey(item.name);
  if (!parsed || !item.id) return null;
  return {
    key: item.name,
    name: parsed.originalName,
    size: typeof item.metadata?.size === "number" ? item.metadata.size : null,
    createdAt: item.created_at ?? null,
  };
}

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
      const file = toLibraryFile(item);
      if (!file) { unknownFiles = true; continue; }
      files.push(file);
    }
    return { status: "ready", files, hasNext: data.length > FILE_PAGE_SIZE, unknownFiles };
  } catch {
    return { status: "error" };
  }
}

export type FileResult =
  | { status: "ready"; file: LibraryFile }
  | { status: "disabled" | "missing" | "invalid" | "error" };

export async function getFile(key: string): Promise<FileResult> {
  if (!parseFileKey(key)) return { status: "invalid" };
  const { supabase, user } = await requireUser();
  if (!filesEnabled()) return { status: "disabled" };
  try {
    const { data, error } = await supabase.storage.from(FILE_BUCKET).list(user.id, { limit: 10, search: key });
    if (error || !data) return { status: "error" };
    const exact = data.find((item) => item.name === key && item.id);
    if (!exact) return { status: "missing" };
    const file = toLibraryFile(exact);
    return file ? { status: "ready", file } : { status: "invalid" };
  } catch {
    return { status: "error" };
  }
}

export type TextExtractionResult =
  | { status: "ready"; input: SourceInput; normalizedLineEndings: boolean; removedBom: boolean; format: "text" | "docx" | "pdf"; pages?: number }
  | { status: "unsupported" | "too_large" | "invalid" | "missing" | "error"; message: string };

export async function extractStoredText(key: string): Promise<TextExtractionResult> {
  const parsed = parseFileKey(key);
  if (!parsed) return { status: "invalid", message: "O identificador deste arquivo é inválido." };
  const isText = /\.(txt|md)$/i.test(parsed.originalName);
  const isDocx = /\.docx$/i.test(parsed.originalName);
  const isPdf = /\.pdf$/i.test(parsed.originalName);
  if (!isText && !isDocx && !isPdf) return { status: "unsupported", message: "A leitura de conteúdo está disponível para TXT, Markdown, DOCX e PDF. O original continua preservado e disponível para download." };

  const { supabase, user } = await requireUser();
  if (!filesEnabled()) return { status: "error", message: "O armazenamento de arquivos ainda não está ativo neste ambiente." };
  const path = `${user.id}/${key}`;
  try {
    const { data: listed, error: listError } = await supabase.storage.from(FILE_BUCKET).list(user.id, { limit: 10, search: key });
    if (listError || !listed) return { status: "error", message: "Não foi possível verificar o arquivo antes da leitura." };
    const exact = listed.find((item) => item.name === key && item.id);
    if (!exact) return { status: "missing", message: "Este arquivo não foi encontrado na sua área privada." };
    const listedSize = typeof exact.metadata?.size === "number" ? exact.metadata.size : null;
    const processLimit = isDocx ? MAX_DOCX_PROCESS_BYTES : isPdf ? MAX_PDF_PROCESS_BYTES : MAX_IMPORT_BYTES;
    if (listedSize !== null && listedSize > processLimit) {
      const message = isDocx
        ? "Para visualizar DOCX, o arquivo precisa ter até 8 MB. O original continua preservado."
        : isPdf
          ? "Para extrair texto de PDF, o arquivo precisa ter até 8 MB. O original continua preservado."
          : "Para visualizar o texto extraído, TXT/Markdown precisa ter até 400 KB. O original continua preservado.";
      return { status: "too_large", message };
    }

    const { data, error } = await supabase.storage.from(FILE_BUCKET).download(path);
    if (error || !data) return { status: "error", message: "Não foi possível ler este arquivo agora." };
    if (data.size > processLimit) {
      const message = isDocx
        ? "Para visualizar DOCX, o arquivo precisa ter até 8 MB. O original continua preservado."
        : isPdf
          ? "Para extrair texto de PDF, o arquivo precisa ter até 8 MB. O original continua preservado."
          : "Para visualizar o texto extraído, TXT/Markdown precisa ter até 400 KB. O original continua preservado.";
      return { status: "too_large", message };
    }
    const bytes = new Uint8Array(await data.arrayBuffer());

    if (isDocx) {
      const extracted = extractDocxText(parsed.originalName, bytes);
      if (!extracted.ok) return { status: extracted.code === "too_large" ? "too_large" : "invalid", message: extracted.message };
      return { status: "ready", input: extracted.value, normalizedLineEndings: false, removedBom: false, format: "docx" };
    }

    if (isPdf) {
      const extracted = await extractPdfText(parsed.originalName, bytes);
      if (!extracted.ok) return { status: extracted.code === "too_large" ? "too_large" : extracted.code === "timeout" ? "error" : "invalid", message: extracted.message };
      return { status: "ready", input: extracted.value, normalizedLineEndings: false, removedBom: false, format: "pdf", pages: extracted.pages };
    }

    const decoded = decodeTextFile(parsed.originalName, bytes);
    if (!decoded.ok) return { status: "invalid", message: decoded.message };
    return { status: "ready", input: decoded.value, normalizedLineEndings: decoded.normalizedLineEndings, removedBom: decoded.removedBom, format: "text" };
  } catch {
    return { status: "error", message: "A conexão foi interrompida durante a leitura. Nenhum texto foi alterado." };
  }
}
