import Link from "next/link";
import { notFound } from "next/navigation";
import { approveReflection, archiveReflection, removeReflectionContextLink, returnReflectionToDraft, saveReflectionContextLink, submitReflectionForReview } from "@/app/reflexoes/actions";
import { ReflectionStageForm } from "@/components/reflection-stage-form";
import { getReflection, getReflectionContext, type ContextRole } from "@/lib/reflections/data";
import { reflectionStageLabel, reflectionStatusLabel } from "@/lib/reflections/validation";
import { formatDate } from "@/lib/sources/data";

function roleLabel(role: ContextRole) {
  if (role === "supports") return "Sustenta";
  if (role === "contrasts") return "Contrasta";
  if (role === "example") return "Exemplo";
  return "Contexto";
}

function ContextLinkForm({ reflectionId, kind, options }: {
  reflectionId: string;
  kind: "memory" | "evidence" | "insight";
  options: Array<{ id: string; label: string }>;
}) {
  if (!options.length) return <p className="field-help">Ainda não há itens disponíveis deste tipo.</p>;
  return <form action={saveReflectionContextLink} className="source-form">
    <input type="hidden" name="reflection_id" value={reflectionId} />
    <input type="hidden" name="kind" value={kind} />
    <label htmlFor={`${kind}-target`}>{kind === "memory" ? "Memória" : kind === "evidence" ? "Evidência" : "Insight"}</label>
    <select id={`${kind}-target`} name="target_id" required defaultValue="">
      <option value="" disabled>Escolha…</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
    <label htmlFor={`${kind}-role`}>Papel nesta reflexão</label>
    <select id={`${kind}-role`} name="role" defaultValue="context">
      <option value="supports">Sustenta</option>
      <option value="context">Contexto</option>
      <option value="contrasts">Contrasta</option>
      <option value="example">Exemplo</option>
    </select>
    <button className="workspace-button neutral" type="submit">Vincular</button>
  </form>;
}

function RemoveContextLink({ reflectionId, kind, targetId }: { reflectionId: string; kind: "memory" | "evidence" | "insight"; targetId: string }) {
  return <form action={removeReflectionContextLink}>
    <input type="hidden" name="reflection_id" value={reflectionId} />
    <input type="hidden" name="kind" value={kind} />
    <input type="hidden" name="target_id" value={targetId} />
    <button className="workspace-button neutral" type="submit">Remover vínculo</button>
  </form>;
}

export default async function ReflectionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  const [reflection, context] = await Promise.all([getReflection(id), getReflectionContext(id)]);
  if (!reflection) notFound();

  const latestRevision = [...reflection.versions].reverse().find((version) => version.stage === "revision") ?? null;
  const editable = reflection.status === "draft" || reflection.status === "review";

  return <>
    <section className="library-panel">
      <div className="library-toolbar">
        <div><p className="eyebrow">{reflectionStatusLabel(reflection.status)}</p><h2>{reflection.title}</h2></div>
        <Link className="workspace-button neutral" href="/reflexoes">← Reflexões</Link>
      </div>
      <div className="source-meta">
        <span>{reflection.versionCount} {reflection.versionCount === 1 ? "versão" : "versões"}</span>
        <span>Atualizada em <time dateTime={reflection.updatedAt}>{formatDate(reflection.updatedAt)}</time></span>
        {reflection.approvedAt ? <span>Aprovada em <time dateTime={reflection.approvedAt}>{formatDate(reflection.approvedAt)}</time></span> : null}
      </div>
      {query.salvo ? <p className="form-status" role="status">Nova versão salva no histórico.</p> : null}
      {query.contexto ? <p className="form-status" role="status">Contexto da reflexão atualizado.</p> : null}
      {query.revisao ? <p className="form-status" role="status">Reflexão enviada para revisão.</p> : null}
      {query.aprovada ? <p className="form-status" role="status">Revisão aprovada por você.</p> : null}
      {query.arquivada ? <p className="form-status" role="status">Reflexão arquivada.</p> : null}
      {query.erro ? <p className="field-error" role="alert">A operação não pôde ser concluída. Recarregue a reflexão e tente novamente.</p> : null}

      <div className="workspace-actions">
        {reflection.status === "draft" ? <form action={submitReflectionForReview}><input type="hidden" name="reflection_id" value={reflection.id} /><button className="workspace-button primary" type="submit">Enviar para revisão</button></form> : null}
        {reflection.status === "review" ? <form action={returnReflectionToDraft}><input type="hidden" name="reflection_id" value={reflection.id} /><button className="workspace-button neutral" type="submit">Voltar para rascunho</button></form> : null}
        {reflection.status === "review" && latestRevision ? <form action={approveReflection}><input type="hidden" name="reflection_id" value={reflection.id} /><input type="hidden" name="version_id" value={latestRevision.id} /><button className="workspace-button primary" type="submit">Aprovar revisão mais recente</button></form> : null}
        {reflection.status !== "archived" ? <form action={archiveReflection}><input type="hidden" name="reflection_id" value={reflection.id} /><button className="workspace-button neutral" type="submit">Arquivar</button></form> : null}
      </div>
      {reflection.status === "review" && !latestRevision ? <p className="field-help">Crie ao menos uma versão na etapa “7. Revisão” antes da aprovação.</p> : null}
    </section>

    <section className="library-panel">
      <div className="section-title"><div><p className="eyebrow">3. Memórias e contexto</p><h2>Base rastreável desta reflexão</h2></div></div>
      <p>Vincule o que realmente participa desta reflexão. Os objetos originais continuam separados; aqui guardamos apenas a relação e o papel que cada um exerce.</p>
      {!context ? <p className="field-error">Não foi possível carregar o contexto agora. As versões da reflexão continuam preservadas.</p> : <>
        {editable ? <div className="source-grid">
          <article className="source-card"><h3>Adicionar memória</h3><ContextLinkForm reflectionId={reflection.id} kind="memory" options={context.memoryOptions.map((item) => ({ id: item.id, label: item.title }))} /></article>
          <article className="source-card"><h3>Adicionar evidência</h3><ContextLinkForm reflectionId={reflection.id} kind="evidence" options={context.evidenceOptions.map((item) => ({ id: item.id, label: item.sourceLabel }))} /></article>
          <article className="source-card"><h3>Adicionar insight</h3><ContextLinkForm reflectionId={reflection.id} kind="insight" options={context.insightOptions.map((item) => ({ id: item.id, label: item.title }))} /></article>
        </div> : <p className="field-help">Esta reflexão está concluída; sua base de contexto está congelada para preservar a proveniência histórica.</p>}

        <h3>Memórias vinculadas</h3>
        {context.memories.length ? <ul className="source-grid">{context.memories.map((item) => <li className="source-card" key={item.id}>
          <p className="eyebrow">{roleLabel(item.role)}</p><h3>{item.title}</h3>{item.reflection ? <p>{item.reflection.length > 500 ? `${item.reflection.slice(0, 500)}…` : item.reflection}</p> : null}
          <div className="workspace-actions"><Link className="workspace-button neutral" href={`/memoria/${item.id}`}>Abrir memória</Link>{editable ? <RemoveContextLink reflectionId={reflection.id} kind="memory" targetId={item.id} /> : null}</div>
        </li>)}</ul> : <p className="field-help">Nenhuma memória vinculada.</p>}

        <h3>Evidências vinculadas</h3>
        {context.evidence.length ? <ul className="source-grid">{context.evidence.map((item) => <li className="source-card" key={item.id}>
          <p className="eyebrow">{roleLabel(item.role)}</p><h3>{item.sourceLabel}</h3><p>{item.excerpt.length > 700 ? `${item.excerpt.slice(0, 700)}…` : item.excerpt}</p>
          <div className="workspace-actions">{item.storageKey ? <Link className="workspace-button neutral" href={`/biblioteca/arquivos/${encodeURIComponent(item.storageKey)}`}>Abrir origem</Link> : null}{editable ? <RemoveContextLink reflectionId={reflection.id} kind="evidence" targetId={item.id} /> : null}</div>
        </li>)}</ul> : <p className="field-help">Nenhuma evidência vinculada.</p>}

        <h3>Insights vinculados</h3>
        {context.insights.length ? <ul className="source-grid">{context.insights.map((item) => <li className="source-card" key={item.id}>
          <p className="eyebrow">{roleLabel(item.role)}</p><h3>{item.title}</h3><p>{item.statement.length > 600 ? `${item.statement.slice(0, 600)}…` : item.statement}</p>
          <div className="workspace-actions"><Link className="workspace-button neutral" href={`/cerebro/${item.id}`}>Abrir insight</Link>{editable ? <RemoveContextLink reflectionId={reflection.id} kind="insight" targetId={item.id} /> : null}</div>
        </li>)}</ul> : <p className="field-help">Nenhum insight vinculado.</p>}
      </>}
    </section>

    {editable ? <section className="library-panel">
      <p className="eyebrow">Nova versão</p>
      <h2>Registrar uma etapa sem apagar o passado</h2>
      <p>O fluxo base é: Externa → Meu comentário → Memórias/Contexto → Conflitos → Plano → IA → Revisão. A IA permanece desligada até a avaliação e configuração explícitas.</p>
      <ReflectionStageForm reflectionId={reflection.id} />
    </section> : null}

    <section className="library-panel">
      <div className="section-title"><div><p className="eyebrow">Histórico imutável</p><h2>Versões da reflexão</h2></div><span>{reflection.versionCount}</span></div>
      {reflection.versions.length ? <div className="source-grid">{[...reflection.versions].reverse().map((version) => <article className="source-card" key={version.id}>
        <div className="library-toolbar"><p className="eyebrow">{reflectionStageLabel(version.stage)}</p><span className="file-kind">{version.authorKind === "ai" ? "IA" : "VOCÊ"}</span></div>
        <time dateTime={version.createdAt}>{formatDate(version.createdAt)}</time>
        <p>{version.content}</p>
        {reflection.approvedVersionId === version.id ? <strong>✓ Versão aprovada</strong> : null}
      </article>)}</div> : <p>Ainda não há versões. Registre a primeira etapa acima.</p>}
    </section>
  </>;
}
