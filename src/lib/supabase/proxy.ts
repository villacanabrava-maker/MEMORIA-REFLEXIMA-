import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";
import { safeReturnPath } from "@/lib/auth/return-path";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const pathname = request.nextUrl.pathname;
  let destination: URL | undefined;
  if (!data?.claims && pathname !== "/login") {
    destination = new URL("/login", request.url);
    destination.searchParams.set("retorno", safeReturnPath(`${pathname}${request.nextUrl.search}`));
  } else if (data?.claims && pathname === "/login" && request.nextUrl.searchParams.get("erro") !== "sessao") {
    destination = new URL(safeReturnPath(request.nextUrl.searchParams.get("retorno")), request.url);
  }
  if (destination) {
    const redirected = NextResponse.redirect(destination);
    response.cookies.getAll().forEach((cookie) => redirected.cookies.set(cookie));
    response = redirected;
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
