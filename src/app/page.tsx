import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getDashboardData } from "@/lib/dashboard/data";
import { kindLabel } from "@/lib/library/catalog";
import { formatDate } from "@/lib/sources/data";

export default async function Home() {
  const dashboard = await getDashboardData();
  return (
    <AppShell active="inicio" title="Vamos organizar suas ideias?" eyebrow="Seu espaço de pensamento">
      <section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="kicker">Memória com origem. Reflexão com escolha.</p><h2 id="hero-title">Um lugar para guardar, compreender, relacionar e revisar o que merece ser lembrado.</h2><p>Adicione seu acervo, preserve os originais, transforme passagens importantes em evidências, registre memórias, revise interpretações e desenvolva reflexões com histórico.</p><div className="workspace-actions"><Link className="workspace-button primary" href="/biblioteca/arquivos/novo">＋ Adicionar arquivo</Link><Link className="workspace-button neutral" href="/memoria/novo">Criar memória</Link><Link className="workspace-button neutral" href="/cerebro">Meu Cérebro</Link><Link className="workspace-button neutral" href="/reflexoes/nova">Criar reflexão</Link></div></div></section>

      <section aria-labelledby="overview-title"><div className="section-title"><div><p className="eyebrow">Visão geral</p><h2 id="overview-title">O que existe hoje no seu espaço</h2></div></div><div className="metrics">
        <article className="metric"><div className="metric-icon amber" aria-hidden="true">▥</div><div><p>Minha Biblioteca</p><strong>{dashboard ? dashboard.libraryItems.toLocaleString("pt-BR") : "—"}</strong><small>{dashboard ? "Arquivos e textos catalogados" : "Contagem indisponível"}</small></div></article>
        <article className="metric"><div className="metric-icon violet" aria-hidden="true">◇</div><div><p>Minha Memória</p><strong>{dashboard ? dashboard.memories.toLocaleString("pt-BR") : "—"}</strong><small>{dashboard ? "Memórias estruturadas por você" : "Contagem indisponível"}</small></div></article>
        <article className="metric"><div className="metric-icon blue" aria-hidden="true">⌁</div><div><p>Evidências</p><strong>{dashboard ? dashboard.evidence.toLocaleString("pt-BR") : "—"}</strong><small>{dashboard ? "Trechos e fontes rastreáveis" : "Contagem indisponível"}</small></div></article>
        <article className="metric"><div className="metric-icon blue" aria-hidden="true">◉</div><div><p>Meu Cérebro</p><strong>{dashboard ? dashboard.brainInsights.toLocaleString("pt-BR") : "—"}</strong><small>{dashboard ? "Interpretações em revisão ou confirmadas" : "Contagem indisponível"}</small></div></article>
        <article className="metric"><div className="metric-icon violet" aria-hidden="true">✦</div><div><p>Reflexões</p><strong>{dashboard ? dashboard.reflections.toLocaleString("pt-BR") : "—"}</strong><small>{dashboard ? "Processos versionados de reflexão" : "Contagem indisponível"}</small></div></article>
      </div></section>

      <section style={{ marginTop: 30 }} aria-labelledby="recent-title"><div className="section-title"><div><p className="eyebrow">Continuidade</p><h2 id="recent-title">Itens recentes da Biblioteca</h2></div><Link className="workspace-button neutral" href="/biblioteca">Ver tudo</Link></div>
        {!dashboard ? <div className="library-panel"><p>Não foi possível carregar o resumo agora. Seu conteúdo continua preservado.</p></div> : dashboard.recent.length ? <ul className="source-grid">{dashboard.recent.map((item) => <li className="source-card" key={item.id}>{item.href ? <Link href={item.href}><p className="eyebrow">{kindLabel(item.kind as Parameters<typeof kindLabel>[0])}</p><h3>{item.title}</h3><time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time><span className="source-open">Abrir →</span></Link> : <div><p className="eyebrow">{item.kind}</p><h3>{item.title}</h3></div>}</li>)}</ul> : <div className="library-panel"><h2>Tudo começa com uma fonte</h2><p>Adicione um arquivo ou escreva um texto para começar sua Biblioteca.</p><Link className="workspace-button primary" href="/biblioteca/arquivos/novo">Adicionar meu primeiro arquivo</Link></div>}
      </section>

      <section className="library-panel" style={{ marginTop: 30 }}>
        <p className="eyebrow">Fluxo atual</p>
        <h2>Da fonte à reflexão aprovada</h2>
        <p>Biblioteca, Evidências, Minha Memória, Meu Cérebro e Reflexões agora possuem estruturas próprias. A geração por IA continua desligada até concluirmos avaliação, configuração de privacidade e escolha do provedor/modelo.</p>
      </section>
    </AppShell>
  );
}
