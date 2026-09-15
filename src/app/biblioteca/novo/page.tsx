import { LibraryNotice } from "@/components/library-notice";
import { SourceForm } from "@/components/source-form";
import { requireUser } from "@/lib/auth/require-user";
import { libraryEnabled } from "@/lib/sources/data";

export const metadata = { title: "Novo texto | Memória Reflexiva" };

export default async function NewSourcePage() {
  await requireUser();
  if (!libraryEnabled()) return <LibraryNotice status="disabled" />;
  return <section className="library-panel"><p className="eyebrow">Adicionar fonte</p><h2>Guarde um texto original</h2><p>Esta etapa guarda apenas texto. Não faz resumo, extração de memórias nem envio para serviços de inteligência artificial.</p><SourceForm /></section>;
}
