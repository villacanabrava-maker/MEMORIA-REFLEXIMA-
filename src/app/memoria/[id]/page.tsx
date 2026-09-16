import Link from "next/link";
import { notFound } from "next/navigation";
import { addMemoryRelation, deleteMemoryRelation } from "@/app/memoria/relations-actions";
import { getMemory } from "@/lib/memory/data";
import { getMemoryRelations, listRelationTargets, MEMORY_RELATION_TYPES, relationLabel } from "@/lib/memory/relations";
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

export default async function MemoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ relacao?: string }>;
}) {
  const { id } = await params;
  const statusParams = await searchParams;
  const memory = await getMemory(id);
  if (!memory) notFound();
  const [relations, targets] = await Promise.all([getMemoryRelations(id), listRelationTargets(id)]);

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

    <section className="library-panel">
      <div className="section-title"><div><p className="eyebrow">Rede de ideias</p><h2>Relações com outras memórias</h2></div></div>
      {statusParams.relacao === "salva" ? <p className="form-status" role="status">Relação salva.</p> : null}
      {statusParams.relacao === "erro" ? <p className="field-error" role="status">Não foi possível salvar esta relação. Verifique se ela já existe.</p> : null}
      {relations?.length ? <ul className="source-grid">{relations.map((relation) => <li className="source-card" key={relation.id}>
        <p className="eyebrow">{relationLabel(relation.type, relation.direction)}</p>
        <h3><Link href={`/memoria/${relation.otherId}`}>{relation.otherTitle}</Link></h3>
        {relation.note ? <p>{relation.note}</p> : null}
        <form action={deleteMemoryRelation}>
          <input type="hidden" name="relation_id" value={relation.id} />
          <input type="hidden" name="memory_id" value={memory.id} />
          <button className="workspace-button neutral" type="submit">Remover relação</button>
        </form>
      </li>)}</ul> : <p>Ainda não há relações registradas para esta memória.</p>}

      {targets?.length ? <form action={addMemoryRelation} className="source-form">
        <input type="hidden" name="from_memory_id" value={memory.id} />
        <label htmlFor="relation-target">Relacionar com</label>
        <select id="relation-target" name="to_memory_id" required defaultValue="">
          <option value="" disabled>Escolha outra memória</option>
          {targets.map((target) => <option key={target.id} value={target.id}>{target.title}</option>)}
        </select>
        <label htmlFor="relation-type">Tipo da relação</label>
        <select id="relation-type" name="relation_type" defaultValue="related_to">
          {MEMORY_RELATION_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <label htmlFor="relation-note">Observação opcional</label>
        <textarea id="relation-note" name="note" maxLength={2000} rows={3} placeholder="Por que essas memórias se relacionam?" />
        <button className="workspace-button primary" type="submit">Adicionar relação</button>
      </form> : <p className="field-help">Crie ao menos mais uma memória para começar a relacionar ideias.</p>}
    </section>
  </>;
}
