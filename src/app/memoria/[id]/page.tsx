import Link from "next/link";
import { notFound } from "next/navigation";
import { getMemory } from "@/lib/memory/data";
import { memoryTypeLabel } from "@/lib/memory/validation";
import { formatDate } from "@/lib/sources/data";

function statusLabel(status: string) {
  if (status === "confirmed") return "Confirmada por mim";
  if (status === "archived") return "Arquivada";
  return "Rascunho";
}

function roleLabel(role: string) {
  if (role === "context") return "Contexto";
  if (role === "contrasts") return "Contrasta";
  if (role === "example") return "Exemplo";
  return "Sustenta";
}

export default async function MemoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memory = await getMemory(id);
  if (!memory) notFound();

  return <>
    <section className="library-panel">
      <div className="library-toolbar">
        <div>
          <p className="eyebrow">{memoryTypeLabel(memory.nodeType)}</p>
          <h2>{memory.title}</h2>
        </div>
        <div className="workspace-actions">
          <Link className="workspace-button neutral" href="/memoria">← Minha Memória</Link>
          <Link className="workspace-button primary" href={`/memoria/${memory.id}/editar`}>Editar</Link>
        </div>
      </div>
      <div className="source-meta">
        <span>{statusLabel(memory.status)}</span>
        <span>{memory.evidenceCount} {memory.evidenceCount === 1 ? "evidência" : "evidências"}</span>
        <span>Atualizada em <time dateTime={memory.updatedAt}>{formatDate(memory.updatedAt)}</time></span>
      </div>
      <div className="source-body">
        <h3>Minha compreensão</h3>
        <p>{memory.reflection || "Esta memória ainda não possui uma reflexão escrita."}</p>
      </div>
    </section>

    <section className="library-panel">
      <div className="section-title"><div><p className="eyebrow">Por que esta memória existe?</p><h2>Evidências relacionadas</h2></div><Link className="workspace-button neutral" href="/biblioteca/evidencias">Procurar evidências</Link></div>
      {memory.evidence.length ? <ul className="source-grid">{memory.evidence.map((evidence) => <li className="source-card" key={evidence.id}>
        <p className="eyebrow">{roleLabel(evidence.role)}</p>
        <h3>{evidence.sourceLabel}</h3>
        <p>{evidence.excerpt.length > 800 ? `${evidence.excerpt.slice(0, 800)}…` : evidence.excerpt}</p>
        {evidence.note ? <small>{evidence.note}</small> : null}
        {evidence.documentStorageKey ? <Link className="source-open" href={`/biblioteca/arquivos/${encodeURIComponent(evidence.documentStorageKey)}`}>Abrir origem →</Link> : null}
      </li>)}</ul> : <div><p>Nenhuma evidência foi ligada ainda. A memória pode existir como rascunho, mas evidências serão necessárias para interpretações rastreáveis do futuro Meu Cérebro.</p><Link className="workspace-button neutral" href="/biblioteca/evidencias">Escolher uma evidência</Link></div>}
    </section>
  </>;
}
