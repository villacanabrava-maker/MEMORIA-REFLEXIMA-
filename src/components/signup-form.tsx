"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/app/cadastro/actions";
import type { SignupState } from "@/lib/auth/signup";

const initialState: SignupState = { message: "" };

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, initialState);
  return <>
    {state.message ? <div className="form-message" role="status" aria-live="polite">{state.message}</div> : null}
    {!state.submitted ? <form action={action} className="login-form" aria-busy={pending}>
      <label htmlFor="signup-email">E-mail</label>
      <input id="signup-email" name="email" type="email" autoComplete="email" maxLength={320} required readOnly={pending} placeholder="voce@exemplo.com" />
      <label htmlFor="signup-password">Senha</label>
      <input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={6} maxLength={4096} required readOnly={pending} />
      <label htmlFor="signup-confirmation">Confirme a senha</label>
      <input id="signup-confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={6} maxLength={4096} required readOnly={pending} />
      <button type="submit" disabled={pending}>{pending ? "Enviando cadastro…" : "Criar conta"}</button>
    </form> : null}
    <div className="invitation-note"><Link href="/login" style={{ color: "inherit", fontWeight: 700 }}>Já tenho conta — entrar</Link><p>Após confirmar seu e-mail, volte a esta tela para entrar, mesmo que o link recebido abra outra página.</p></div>
  </>;
}
