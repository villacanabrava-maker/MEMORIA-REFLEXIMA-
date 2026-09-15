"use server";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { signupEnabled, validateSignup, type SignupState } from "@/lib/auth/signup";

export async function signup(previous: SignupState, formData: FormData): Promise<SignupState> {
  void previous;
  if (!signupEnabled()) return { message: "O cadastro pela aplicação não está habilitado neste ambiente." };
  const input = validateSignup(formData.get("email"), formData.get("password"), formData.get("confirmation"));
  if (!input.ok) return { message: input.message };
  try {
    const { url, publishableKey } = getSupabaseEnv();
    // Public Auth API only. No admin key, account auto-confirmation or password logging.
    // Users sign in through the existing SSR login after confirming their email.
    const supabase = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: "implicit" },
    });
    const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password });
    if (error) {
      if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
        return { message: "O limite de solicitações foi atingido. Aguarde antes de tentar novamente." };
      }
      if (error.code === "email_address_not_authorized") {
        return { message: "O serviço de e-mail deste ambiente ainda não autoriza esse destinatário. O administrador precisa configurar o envio de e-mails ou criar a conta pelo painel do Supabase." };
      }
      if (error.code === "signup_disabled") {
        return { message: "O cadastro está desativado no Supabase. Peça ao administrador para criar sua conta pelo painel." };
      }
      if (error.code === "weak_password") return { message: "A senha não atende às regras do projeto. Escolha uma senha mais forte." };
      return { message: "Não foi possível concluir o cadastro. Confira os dados; caso já tenha uma conta, use a tela de login." };
    }
    if (data.session) {
      await supabase.auth.signOut({ scope: "local" });
      return { submitted: true, message: "Cadastro concluído. Volte à tela de login e entre com o e-mail e a senha que você informou." };
    }
    return { submitted: true, message: "Solicitação recebida. Verifique sua caixa de entrada e o spam, confirme o e-mail quando solicitado e depois volte à tela de login. Caso já tenha uma conta, tente entrar." };
  } catch {
    return { message: "Não foi possível confirmar o resultado. Verifique seu e-mail ou tente entrar antes de repetir o cadastro." };
  }
}
