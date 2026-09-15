import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LibraryNotice } from "@/components/library-notice";
import { formatDate, getLibrary } from "@/lib/sources/data";

export default async function Home() {
  const library = await getLibrary();
  return (
    <AppShell active="inicio" title="Vamos organizar suas ideias?" eyebrow="Seu espaço de pensamento">
      <section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="kicker">Memória com origem. Reflexão com escolha.</p><h2 id="hero-title">Um lugar para guardar o que merece ser lembrado.</h2><p>Comece pelos seus textos. Dê um título a cada fonte, releia quando precisar e mantenha o conteúdo sob sua autoria.</p><div className="workspace-actions"><Link className="workspace-button primary" href="/biblioteca/novo">＋ Adicionar texto</Link><Link className="workspace-button neutral" href="/biblioteca">Abrir biblioteca</Link></div></div></section>
      <section aria-labelledby="overview-title"><div className="section-title"><div><p className="eyebrow">Visão geral</p><h2 id="overview-title">Seu acervo, sem números inventados</h2></div></div><div className="metrics">
        <article className="metric"><div className="metric-icon amber" aria-hidden="true">▥</div><div><p>Textos</p><strong>{library.status === "ready" ? library.total.toLocaleString("pt-BR") : "—"}</strong><small>{library.status === "ready" ? "Fontes da sua biblioteca" : "Contagem indisponível"}</small></div></article>
        <article className="metric"><div className="metric-icon violet" aria-hidden="true">◉</div><div><p>Memórias com evidências</p><strong className="metric-coming">Em breve</strong><small>Processamento ainda não implementado</small></div></article>
        <article className="metric"><div className="metric-icon blue" aria-hidden="true">✦</div><div><p>Reflexões</p><strong className="metric-coming">Em breve</strong><small>Criação ainda não implementada</small></div></article>
      </div></section>
      <section style={{ marginTop: 30 }} aria-labelledby="recent-title"><div className="section-title"><h2 id="recent-title">Textos recentes</h2></div>
        {library.status !== "ready" ? <LibraryNotice status={library.status} /> : library.sources.length ? <ul className="source-grid">{library.sources.slice(0, 3).map((source) => <li className="source-card" key={source.id}><Link href={`/biblioteca/${source.id}`}><p className="eyebrow">Fonte textual</p><h3>{source.title}</h3><time dateTime={source.created_at}>{formatDate(source.created_at)}</time><span className="source-open">Abrir texto →</span></Link></li>)}</ul> : <div className="library-panel"><h2>Tudo começa com uma fonte</h2><p>Você ainda não guardou textos. Adicione o primeiro para começar sua biblioteca.</p><Link className="workspace-button primary" href="/biblioteca/novo">Guardar meu primeiro texto</Link></div>}
      </section>
    </AppShell>
  );
}
