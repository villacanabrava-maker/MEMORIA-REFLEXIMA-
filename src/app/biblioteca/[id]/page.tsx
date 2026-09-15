import Link from "next/link";
import { DeleteSourceForm } from "@/components/delete-source-form";
import { LibraryNotice } from "@/components/library-notice";
import { formatDate, getSource } from "@/lib/sources/data";

export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getSource(id);
  if (result.status !== "ready") return <LibraryNotice status={result.status} />;
  const { source } = result;
  return <article className="library-panel"><Link className="workspace-button neutral" href="/biblioteca">← Biblioteca</Link><div className="workspace-actions"><div><p className="eyebrow">Fonte textual</p><h2>{source.title}</h2></div></div><div className="source-meta"><span>Criado em <time dateTime={source.created_at}>{formatDate(source.created_at)}</time></span><span>Atualizado em <time dateTime={source.updated_at}>{formatDate(source.updated_at)}</time></span></div><Link className="workspace-button neutral" href={`/biblioteca/${source.id}/editar`}>Editar texto</Link><div className="source-body">{source.content}</div><DeleteSourceForm id={source.id} version={source.updated_at} /></article>;
}
