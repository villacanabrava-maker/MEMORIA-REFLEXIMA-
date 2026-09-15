"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function logout(): Promise<{ message: string }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { message: "Não foi possível encerrar a sessão. Tente novamente." };
  } catch {
    return { message: "Verifique a conexão e tente sair novamente." };
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
