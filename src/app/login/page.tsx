import { login } from "./actions";
import { safeReturnPath } from "@/lib/auth/return-path";

const messages: Record<string, string> = {
  campos: "Preencha seu e-mail e sua senha.",
  credenciais: "Não foi possível entrar. Confira os dados e tente novamente.",
  sessao: "Sua sessão não pôde ser validada. Entre novamente.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string | string[]; retorno?: string | string[] }> }) {
  const { erro, retorno } = await searchParams;
  const message = typeof erro === "string" ? messages[erro] : undefined;
  return (
    <main className="login-page">
      <section className="login-intro"><div className="login-brand"><span aria-hidden="true">MR</span><div><strong>Memória</strong><strong>Reflexiva</strong></div></div><div><p className="eyebrow">Memória com origem</p><h1>Um espaço reservado para pensar com profundidade.</h1><p>Suas fontes permanecem rastreáveis. Suas reflexões só passam a representar você quando você decidir.</p></div><small>Privado por padrão · Em construção cuidadosa</small></section>
      <section className="login-panel" aria-labelledby="login-title"><div className="login-form-wrap"><p className="eyebrow">Acesso privado</p><h2 id="login-title">Entre no seu espaço</h2><p>Use o e-mail cadastrado no projeto.</p>{message ? <div className="form-message" role="alert">{message}</div> : null}<form action={login} className="login-form"><input type="hidden" name="retorno" value={safeReturnPath(retorno)} /><label htmlFor="email">E-mail</label><input autoComplete="email" id="email" name="email" placeholder="voce@exemplo.com" required type="email" maxLength={320} /><label htmlFor="password">Senha</label><input autoComplete="current-password" id="password" minLength={6} maxLength={4096} name="password" placeholder="Sua senha" required type="password" /><button type="submit">Entrar com segurança</button></form><div className="invitation-note"><strong>Acesso por convite</strong><p>Nesta primeira fase, novas contas serão autorizadas manualmente.</p></div></div></section>
    </main>
  );
}
