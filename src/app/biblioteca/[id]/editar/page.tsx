import { SourceForm } from "@/components/source-form";
import { LibraryNotice } from "@/components/library-notice";
import { getSource } from "@/lib/sources/data";

export const metadata = { title: "Editar texto | Memória Reflexiva" };

export default async function EditSourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getSource(id);
  if (result.status !== "ready") return <LibraryNotice status={result.status} />;
  return <section className="library-panel"><p className="eyebrow">Editar fonte</p><h2>Revise seu texto</h2><p>Salvar substitui o conteúdo atual. Esta versão ainda não mantém um histórico de edições.</p><SourceForm key={result.source.updated_at} source={result.source} /></section>;
}
