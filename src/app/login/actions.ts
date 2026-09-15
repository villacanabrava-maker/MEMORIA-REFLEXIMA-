"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/auth/return-path";

export async function login(formData: FormData) {
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")).trim() : "";
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const returnPath = safeReturnPath(formData.get("retorno"));
  const failure = (code: string): never => redirect(`/login?${new URLSearchParams({ erro: code, retorno: returnPath })}`);
  if (!email || !password || email.length > 320 || password.length > 4096) failure("campos");
  const supabase = await createClient();
  let failed = false;
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    failed = Boolean(error);
  } catch {
    failed = true;
  }
  if (failed) failure("credenciais");
  redirect(returnPath);
}
