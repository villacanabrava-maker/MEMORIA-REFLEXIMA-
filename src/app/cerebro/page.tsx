import Link from "next/link";
import { listBrainInsights } from "@/lib/brain/data";
import { brainStatusLabel, brainTypeLabel } from "@/lib/brain/validation";
import { formatDate } from "@/lib/sources/data";

export default async function BrainPage() {
  const insights = await listBrainInsights();
  if (!insights) return <section className="library-panel"><h2>Não foi possível abrir Meu Cérebro agora.</h2><p>Suas memórias e evidências continuam preservadas.</p></section>;

  return <>
    <section className="library-panel">
      <div className="library-toolbar">
        <div>
          <p className="eyebrow">Interpretação, não identidade</p>
          <h2>O que seu acervo sugere sobre sua forma de pensar</h2>
          <p>Meu Cérebro registra hipóteses interpretativas apoiadas por memórias e evidências. Nenhuma interpretação é tratada como uma verdade definitiva sobre você.</p>
        </div>
        <div className="workspace-actions">
          <Link className="workspace-button neutral" href="/cerebro/contexto">Pesquisar contexto</Link>
          <Link className="workspace-button primary" href="/cerebro/novo">＋ Nova interpretação</Link>
        </div>
      </div>
    </section>

    <section className="library-panel">
      <div className="section-title"><div><p className="eyebrow">Visão geral</p><h2>Interpretações</h2></div><p className="result-count" role="status">{insights.length.toLocaleString("pt-BR")} {insights.length === 1 ? "interpretação" : "interpretações"}</p></div>
      {insights.length ? <ul className="source-grid">{insights.map((insight) => <li className="source-card" key={insight.id}>
        <Link href={`/cerebro/${insight.id}`}>
          <div className="library-toolbar"><p className="eyebrow">{brainTypeLabel(insight.insightType)}</p><span className="file-kind">{insight.origin === "ai" ? "IA" : "MANUAL"}</span></div>
          <h3>{insight.title}</h3>
          <p>{insight.statement.length > 280 ? `${insight.statement.slice(0, 280)}…` : insight.statement}</p>
          <small>{brainStatusLabel(insight.status)} · {insight.memoryCount} memórias · {insight.evidenceCount} evidências · {insight.feedbackCount} avaliações</small>
          <time dateTime={insight.updatedAt}>Atualizado em {formatDate(insight.updatedAt)}</time>
          <span className="source-open">Abrir interpretação →</span>
        </Link>
      </li>)}</ul> : <div>
        <h3>Meu Cérebro ainda está vazio</h3>
        <p>Comece registrando manualmente uma interpretação baseada em suas memórias ou evidências. Você também pode testar a recuperação de contexto antes da futura geração automática.</p>
        <div className="workspace-actions"><Link className="workspace-button neutral" href="/cerebro/contexto">Pesquisar contexto</Link><Link className="workspace-button primary" href="/cerebro/novo">Criar a primeira interpretação</Link></div>
      </div>}
    </section>
  </>;
}
