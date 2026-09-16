import Link from "next/link";
import { notFound } from "next/navigation";
import { BrainFeedbackForm } from "@/components/brain-feedback-form";
import { getBrainInsight } from "@/lib/brain/data";
import { brainStatusLabel, brainTypeLabel, feedbackLabel } from "@/lib/brain/validation";
import { formatDate } from "@/lib/sources/data";

function roleLabel(role: string) {
  if (role === "context") return "Contexto";
  if (role === "contrasts") return "Contrasta";
  if (role === "example") return "Exemplo";
  return "Sustenta";
}

export default async function BrainInsightPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ feedback?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const insight = await getBrainInsight(id);
  if (!insight) notFound();

  return <>
    <section className="library-panel">
      <div className="library-toolbar">
        <div>
          <p className="eyebrow">{brainTypeLabel(insight.insightType)}</p>
          <h2>{insight.title}</h2>
        </div>
        <div className="workspace-actions">
          <Link className="workspace-button neutral" href="/cerebro">← Meu Cérebro</Link>
          <Link className="workspace-button primary" href={`/cerebro/${insight.id}/editar`}>Editar interpretação</Link>
        </div>
      </div>
      <div className="source-meta">
        <span>{brainStatusLabel(insight.status)}</span>
        <span>{insight.origin === "ai" ? "Origem: IA" : "Origem: registro manual"}</span>
        <span>{insight.memoryCount} {insight.memoryCount === 1 ? "memória" : "memórias"}</span>
        <span>{insight.evidenceCount} {insight.evidenceCount === 1 ? "evidência" : "evidências"}</span>
        <span>Atualizada em <time dateTime={insight.updatedAt}>{formatDate(insight.updatedAt)}</time></span>
      </div>
      <div className="source-body">
        <h3>Interpretação</h3>
        <p>{insight.statement}</p>
      </div>
      <p className="field-help">Esta é uma interpretação do seu acervo, não uma definição objetiva de quem você é. Você pode confirmá-la, rejeitá-la, corrigi-la ou arquivá-la.</p>
      {insight.origin === "ai" ? <p className="field-help">Modelo registrado pelo sistema: {insight.generationModel ?? "não informado"}{insight.generationVersion ? ` · versão ${insight.generationVersion}` : ""}.</p> : null}
    </section>

    <section className="library-panel">
      <div className="section-title"><div><p className="eyebrow">Por que você concluiu isso?</p><h2>Base da interpretação</h2></div></div>
      {insight.memories.length ? <><h3>Memórias relacionadas</h3><ul className="source-grid">{insight.memories.map((memory) => <li className="source-card" key={memory.id}>
        <p className="eyebrow">{roleLabel(memory.role)}</p>
        <h3>{memory.title}</h3>
        {memory.note ? <p>{memory.note}</p> : null}
        <Link className="source-open" href={`/memoria/${memory.id}`}>Abrir memória →</Link>
      </li>)}</ul></> : null}

      {insight.evidence.length ? <><h3>Evidências documentais</h3><ul className="source-grid">{insight.evidence.map((evidence) => <li className="source-card" key={evidence.id}>
        <p className="eyebrow">{roleLabel(evidence.role)}</p>
        <h3>{evidence.sourceLabel}</h3>
        <p>{evidence.excerpt.length > 900 ? `${evidence.excerpt.slice(0, 900)}…` : evidence.excerpt}</p>
        {evidence.note ? <small>{evidence.note}</small> : null}
        {evidence.storageKey ? <Link className="source-open" href={`/biblioteca/arquivos/${encodeURIComponent(evidence.storageKey)}`}>Abrir origem →</Link> : null}
      </li>)}</ul></> : null}

      {!insight.memories.length && !insight.evidence.length ? <p>Esta interpretação ainda não possui base relacionada. Trate-a como uma hipótese de trabalho até que memórias ou evidências sejam vinculadas.</p> : null}
    </section>

    <section className="library-panel">
      <p className="eyebrow">Revisão humana</p>
      <h2>Esta interpretação representa você?</h2>
      {query.feedback === "salvo" ? <p className="form-status" role="status">Sua avaliação foi registrada no histórico.</p> : null}
      <BrainFeedbackForm insightId={insight.id} />
    </section>

    <section className="library-panel">
      <div className="section-title"><div><p className="eyebrow">Histórico</p><h2>Minhas avaliações</h2></div><span>{insight.feedbackCount}</span></div>
      {insight.feedback.length ? <ul className="source-grid">{insight.feedback.map((entry) => <li className="source-card" key={entry.id}>
        <p className="eyebrow">{feedbackLabel(entry.rating)}</p>
        <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
        {entry.comment ? <p>{entry.comment}</p> : null}
        {entry.correction ? <><strong>Formulação mais fiel:</strong><p>{entry.correction}</p></> : null}
      </li>)}</ul> : <p>Você ainda não avaliou esta interpretação.</p>}
    </section>
  </>;
}
