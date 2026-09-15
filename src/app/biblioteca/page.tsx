import Link from "next/link";
import { redirect } from "next/navigation";
import { LibraryNotice } from "@/components/library-notice";
import { formatDate, getLibrary } from "@/lib/sources/data";
import { libraryUrl, parsePage, searchTerm } from "@/lib/sources/validation";

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; pagina?: string | string[] }> }) {
  const params = await searchParams;
  const query = searchTerm(params.q);
  const requestedPage = parsePage(params.pagina);
  const library = await getLibrary(query, requestedPage);
  if (library.status !== "ready") return <LibraryNotice status={library.status} />;
  if (requestedPage !== library.page) redirect(libraryUrl(query, library.page));
  return <>
    <div className="library-toolbar"><form className="search-form" action="/biblioteca" method="get"><div><label htmlFor="library-search">Buscar pelo título</label><input id="library-search" name="q" type="search" defaultValue={query} maxLength={200} placeholder="Uma ideia, uma leitura…" /></div><button className="workspace-button neutral" type="submit">Buscar</button>{query ? <Link className="workspace-button neutral" href="/biblioteca">Limpar</Link> : null}</form><Link className="workspace-button primary" href="/biblioteca/novo">＋ Adicionar texto</Link></div>
    <p className="result-count" role="status">{library.total.toLocaleString("pt-BR")} {library.total === 1 ? "texto encontrado" : "textos encontrados"}{query ? ` para “${query}”` : " na sua biblioteca"}.</p>
    {library.sources.length ? <ul className="source-grid">{library.sources.map((source) => <li className="source-card" key={source.id}><Link href={`/biblioteca/${source.id}`}><p className="eyebrow">Fonte textual</p><h3>{source.title}</h3><time dateTime={source.created_at}>{formatDate(source.created_at)}</time><span className="source-open">Abrir texto →</span></Link></li>)}</ul> : <section className="library-panel"><h2>{query ? "Nenhum título corresponde à busca" : "Sua primeira fonte começa aqui"}</h2><p>{query ? "Tente outra palavra. A busca desta versão procura somente no título." : "Guarde um texto original, uma anotação ou um trecho de leitura. Upload de arquivos e processamento por IA virão em outra etapa."}</p></section>}
    {library.pages > 1 ? <nav className="pagination" aria-label="Páginas da biblioteca">{library.page > 1 ? <Link className="workspace-button neutral" href={libraryUrl(query, library.page - 1)} rel="prev">← Anterior</Link> : null}<span>Página {library.page} de {library.pages}</span>{library.page < library.pages ? <Link className="workspace-button neutral" href={libraryUrl(query, library.page + 1)} rel="next">Próxima →</Link> : null}</nav> : null}
  </>;
}
