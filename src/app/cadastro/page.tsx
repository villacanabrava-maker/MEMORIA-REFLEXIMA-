import { notFound } from "next/navigation";
import { SignupForm } from "@/components/signup-form";
import { signupEnabled } from "@/lib/auth/signup";

export const dynamic = "force-dynamic";
export const metadata = { title: "Criar conta | Memória Reflexiva", robots: { index: false, follow: false } };

export default function SignupPage() {
  if (!signupEnabled()) notFound();
  return <main className="login-page">
    <section className="login-intro"><div className="login-brand"><span aria-hidden="true">MR</span><div><strong>Memória</strong><strong>Reflexiva</strong></div></div><div><p className="eyebrow">Ambiente de testes</p><h1>Crie seu espaço de leitura e reflexão.</h1><p>Cadastre seu acesso para experimentar a biblioteca textual. Use conteúdos de teste enquanto o aplicativo está em desenvolvimento.</p></div><small>Cadastro por e-mail · Autenticação pelo Supabase</small></section>
    <section className="login-panel" aria-labelledby="signup-title"><div className="login-form-wrap"><p className="eyebrow">Primeiro acesso</p><h2 id="signup-title">Criar minha conta</h2><p>Informe seu e-mail e escolha uma senha. A confirmação de e-mail segue as regras do projeto.</p><SignupForm /></div></section>
  </main>;
}
