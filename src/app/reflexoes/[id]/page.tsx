import Link from "next/link";
import { notFound } from "next/navigation";
import { approveReflection, archiveReflection, returnReflectionToDraft, submitReflectionForReview } from "@/app/reflexoes/actions";
import { ReflectionStageForm } from "@/components/reflection-stage-form";
import { getReflection } from "@/lib/reflections/data";
import { reflectionStageLabel, reflectionStatusLabel } from "@/lib/reflections/validation";
import { formatDate } from "@/lib/sources/data";

export default async function ReflectionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  const reflection = await getReflection(id);
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
      {query.revisao ? <p className="form-status" role="status">Reflexão enviada para revisão.</p> : null}
      {query.aprovada ? <p className="form-status" role="status">Revisão aprovada por você.</p> : null}
      {query.arquivada ? <p className="form-status" role="status">Reflexão arquivada.</p> : null}
      {query.erro ? <p className="field-error" role="alert">A transição não pôde ser concluída. Recarregue a reflexão e tente novamente.</p> : null}

      <div className="workspace-actions">
        {reflection.status === "draft" ? <form action={submitReflectionForReview}><input type="hidden" name="reflection_id" value={reflection.id} /><button className="workspace-button primary" type="submit">Enviar para revisão</button></form> : null}
        {reflection.status === "review" ? <form action={returnReflectionToDraft}><input type="hidden" name="reflection_id" value={reflection.id} /><button className="workspace-button neutral" type="submit">Voltar para rascunho</button></form> : null}
        {reflection.status === "review" && latestRevision ? <form action={approveReflection}><input type="hidden" name="reflection_id" value={reflection.id} /><input type="hidden" name="version_id" value={latestRevision.id} /><button className="workspace-button primary" type="submit">Aprovar revisão mais recente</button></form> : null}
        {reflection.status !== "archived" ? <form action={archiveReflection}><input type="hidden" name="reflection_id" value={reflection.id} /><button className="workspace-button neutral" type="submit">Arquivar</button></form> : null}
      </div>
      {reflection.status === "review" && !latestRevision ? <p className="field-help">Crie ao menos uma versão na etapa “7. Revisão” antes da aprovação.</p> : null}
    </section>

    {editable ? <section className="library-panel">
      <p className="eyebrow">Nova versão</p>
      <h2>Registrar uma etapa sem apagar o passado</h2>
      <p>O fluxo base é: Externa → Meu comentário → Memórias → Conflitos → Plano → IA → Revisão. Nesta fase manual, Memórias serão vinculadas na próxima subetapa e a IA permanece desligada.</p>
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
