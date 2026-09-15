import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { isSourceId, PAGE_SIZE, titlePattern } from "./validation";

export type SourceSummary = { id: string; title: string; created_at: string; updated_at: string };
export type Source = SourceSummary & { content: string };
export type LibraryResult =
  | { status: "ready"; sources: SourceSummary[]; total: number; page: number; pages: number }
  | { status: "disabled" }
  | { status: "error" };

export function libraryEnabled(): boolean {
  return process.env.PRIVATE_LIBRARY_ENABLED === "true";
}

export async function getLibrary(query = "", requestedPage = 1): Promise<LibraryResult> {
  const { supabase, user } = await requireUser();
  if (!libraryEnabled()) return { status: "disabled" };
  try {
    const offset = (requestedPage - 1) * PAGE_SIZE;
    let request = supabase.from("sources")
      .select("id,title,created_at,updated_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (query) request = request.ilike("title", titlePattern(query));
    const { data, count, error } = await request;
    if (error || count === null) return { status: "error" };
    return { status: "ready", sources: (data ?? []) as SourceSummary[], total: count, page: requestedPage, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
  } catch {
    return { status: "error" };
  }
}

export async function getSource(id: string): Promise<{ status: "ready"; source: Source } | { status: "disabled" } | { status: "error" }> {
  const { supabase, user } = await requireUser();
  if (!isSourceId(id)) notFound();
  if (!libraryEnabled()) return { status: "disabled" };
  let source: Source | null = null;
  try {
    const { data, error } = await supabase.from("sources")
      .select("id,title,content,created_at,updated_at")
      .eq("user_id", user.id).eq("id", id).maybeSingle();
    if (error) return { status: "error" };
    source = data as Source | null;
  } catch {
    return { status: "error" };
  }
  // Missing and someone else's record have the same response.
  if (!source) notFound();
  return { status: "ready", source };
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}
