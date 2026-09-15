import { requireUser } from "@/lib/auth/require-user";
import { libraryEnabled } from "@/lib/sources/data";
import { LibraryNotice } from "@/components/library-notice";
import { ImportTextForm } from "@/components/import-text-form";

export const metadata = { title: "Importar texto | Memória Reflexiva" };

export default async function ImportTextPage() {
  await requireUser();
  if (!libraryEnabled()) return <LibraryNotice status="disabled" />;
  return <section className="library-panel">
    <p className="eyebrow">Da leitura para a sua biblioteca</p>
    <h2>Importe um texto, sem perder a decisão</h2>
    <p>Escolha um arquivo TXT ou Markdown, revise o conteúdo e clique em Guardar texto. A leitura acontece no seu navegador; o texto só é enviado ao banco quando você confirma.</p>
    <div className="import-boundary"><strong>O que será guardado?</strong><p>Somente o texto revisado. O arquivo original não é armazenado. Quebras de linha são padronizadas, e Markdown permanece texto, sem renderização de HTML. PDFs, documentos Word e processamento por IA não fazem parte desta etapa.</p></div>
    <ImportTextForm />
  </section>;
}
