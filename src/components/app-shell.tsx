import Link from "next/link";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/require-user";
import { LogoutButton } from "./logout-button";
import "./workspace.css";

export async function AppShell({ active, title, eyebrow, children }: { active: "inicio" | "biblioteca" | "memoria" | "cerebro"; title: string; eyebrow: string; children: ReactNode }) {
  const { user } = await requireUser();
  return (
    <div className="app-frame workspace">
      <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Memória Reflexiva, início"><span className="brand-monogram" aria-hidden="true">MR</span><div><p>Memória</p><p>Reflexiva</p></div></Link>
        <nav className="workspace-nav" aria-label="Navegação principal">
          <Link href="/" aria-current={active === "inicio" ? "page" : undefined} title="Início"><span aria-hidden="true">⌂</span><span className="nav-label">Início</span></Link>
          <Link href="/biblioteca" aria-current={active === "biblioteca" ? "page" : undefined} title="Biblioteca"><span aria-hidden="true">▥</span><span className="nav-label">Biblioteca</span></Link>
          <Link href="/memoria" aria-current={active === "memoria" ? "page" : undefined} title="Minha Memória"><span aria-hidden="true">◇</span><span className="nav-label">Minha Memória</span></Link>
          <Link href="/cerebro" aria-current={active === "cerebro" ? "page" : undefined} title="Meu Cérebro"><span aria-hidden="true">◉</span><span className="nav-label">Meu Cérebro</span></Link>
          <span className="nav-future" aria-disabled="true" title="Reflexões: em desenvolvimento"><span aria-hidden="true">✦</span><span className="nav-label">Reflexões <small>Em breve</small></span></span>
        </nav>
        <div className="sidebar-bottom"><div className="privacy"><span aria-hidden="true">⌾</span><div><strong>Seu espaço privado</strong><p>Originais, evidências, memórias e interpretações com acesso por usuário.</p></div></div></div>
      </aside>
      <main id="main-content" tabIndex={-1}>
        <header className="topbar"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div className="account-actions"><span className="account-email" title={user.email}>{user.email}</span><LogoutButton /></div></header>
        {children}
        <footer><span>Memória com origem. Reflexão com escolha.</span><span>Memória Reflexiva · Em construção</span></footer>
      </main>
    </div>
  );
}
