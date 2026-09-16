import Link from "next/link";
import { normalizeContentSearchQuery, searchLibraryContent } from "@/lib/files/search";
import "../arquivos/files.css";

export const metadata = { title: "Pesquisar conteúdo | Memória Reflexiva" };

export default async function LibrarySearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const query = normalizeContentSearchQuery(params.q);
  const result = await searchLibraryContent(query);

  return <>
    <div className="library-toolbar">
      <Link className="workspace-button neutral" href="/biblioteca">← Biblioteca</Link>
      <Link className="workspace-button primary" href="/biblioteca/arquivos/novo">＋ Adicionar arquivo</Link>
    </div>

    <section className="library-panel">
      <p className="eyebrow">Pesquisa unificada</p>
      <h2>Pesquisar dentro dos seus arquivos</h2>
      <p className="files-explanation">A busca consulta o texto já processado de PDFs, DOCX, TXT, Markdown, ODT, RTF e outros formatos textuais, mantendo a referência do arquivo e da página ou parte de origem.</p>
      <form className="search-form" action="/biblioteca/pesquisar" method="get">
        <div>
          <label htmlFor="content-search">O que você procura?</label>
          <input id="content-search" name="q" type="search" defaultValue={query} maxLength={200} placeholder="Ex.: poder, memória, educação, Maquiavel…" autoFocus />
        </div>
        <button className="workspace-button primary" type="submit">Pesquisar conteúdo</button>
        {query ? <Link className="workspace-button neutral" href="/biblioteca/pesquisar">Limpar</Link> : null}
      </form>
    </section>

    {result.status === "error" ? <section className="library-panel"><p className="field-error" role="status">Não foi possível pesquisar o conteúdo agora. Seus arquivos e textos processados permanecem preservados.</p></section> : null}

    {query && result.status === "ready" ? <section className="library-panel">
      <p className="eyebrow">Resultados</p>
      <h3>{result.matches.length.toLocaleString("pt-BR")} {result.matches.length === 1 ? "trecho encontrado" : "trechos encontrados"}</h3>
      {result.matches.length ? <ul className="source-grid">
        {result.matches.map((match, index) => <li className="source-card" key={`${match.documentId}-${match.sourceKind}-${match.pageNumber ?? match.chunkIndex ?? index}`}>
          <Link href={`/biblioteca/arquivos/${encodeURIComponent(match.storageKey)}`}>
            <p className="eyebrow">{match.locationLabel}</p>
            <h3>{match.fileName}</h3>
            <p>{match.excerpt || "Trecho correspondente encontrado."}</p>
            <span className="source-open">Abrir origem →</span>
          </Link>
        </li>)}
      </ul> : <p>Nenhum trecho corresponde à pesquisa entre os conteúdos já processados.</p>}
    </section> : null}
  </>;
}
