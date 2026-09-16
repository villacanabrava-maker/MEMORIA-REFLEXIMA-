import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteFileButton } from "@/components/delete-file-button";
import { LibraryNotice } from "@/components/library-notice";
import { getFiles, type LibraryFile } from "@/lib/files/server";
import { formatFileSize } from "@/lib/files/validation";
import { formatDate, getLibrary } from "@/lib/sources/data";
import { libraryUrl, parsePage, searchTerm } from "@/lib/sources/validation";
import "./arquivos/files.css";

function FileCards({ files }: { files: LibraryFile[] }) {
  return <ul className="file-list">{files.map((file) => <li className="file-card" key={file.key}>
    <span className="file-kind">{file.name.includes(".") ? file.name.split(".").pop()?.toUpperCase() : "ARQUIVO"}</span>
    <h3>{file.name}</h3>
    <p>{formatFileSize(file.size)}{file.createdAt && Number.isFinite(Date.parse(file.createdAt)) ? ` · ${formatDate(file.createdAt)}` : ""}</p>
    <small>Original preservado em área privada</small>
    <div className="workspace-actions">
      <Link className="workspace-button primary" href={`/biblioteca/arquivos/${file.key}`}>Visualizar</Link>
      <a className="workspace-button neutral" href={`/api/arquivos/${file.key}`}>Baixar original</a>
      <DeleteFileButton fileKey={file.key} name={file.name} />
    </div>
  </li>)}</ul>;
}

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; pagina?: string | string[] }> }) {
  const params = await searchParams;
  const query = searchTerm(params.q);
  const requestedPage = parsePage(params.pagina);
  const [library, files] = await Promise.all([getLibrary(query, requestedPage), getFiles(1)]);
  if (library.status !== "ready") return <LibraryNotice status={library.status} />;
  if (requestedPage !== library.page) redirect(libraryUrl(query, library.page));

  return <>
    <div className="library-toolbar">
      <form className="search-form" action="/biblioteca" method="get"><div><label htmlFor="library-search">Buscar pelo título</label><input id="library-search" name="q" type="search" defaultValue={query} maxLength={200} placeholder="Uma ideia, uma leitura…" /></div><button className="workspace-button neutral" type="submit">Buscar</button>{query ? <Link className="workspace-button neutral" href="/biblioteca">Limpar</Link> : null}</form>
      {files.status === "ready" ? <Link className="workspace-button primary" href="/biblioteca/arquivos/novo">＋ Adicionar arquivo</Link> : null}
    </div>

    {files.status === "ready" ? <section className="library-panel">
      <div className="library-toolbar"><div><p className="eyebrow">Arquivos enviados</p><h2>Seus arquivos</h2></div>{files.hasNext ? <Link className="workspace-button neutral" href="/biblioteca/arquivos">Ver todos</Link> : null}</div>
      <p className="files-explanation">Todo arquivo concluído aparece aqui automaticamente. Clique em Visualizar para abrir o documento dentro da Biblioteca.</p>
      {files.unknownFiles ? <p role="status" className="field-error">Há um item preservado cujo nome interno não pôde ser exibido.</p> : null}
      {files.files.length ? <FileCards files={files.files} /> : <p>Nenhum arquivo enviado ainda.</p>}
    </section> : null}

    <section className="library-panel">
      <p className="eyebrow">Textos salvos</p>
      <p className="result-count" role="status">{library.total.toLocaleString("pt-BR")} {library.total === 1 ? "texto encontrado" : "textos encontrados"}{query ? ` para “${query}”` : " na sua biblioteca"}.</p>
      {library.sources.length ? <ul className="source-grid">{library.sources.map((source) => <li className="source-card" key={source.id}><Link href={`/biblioteca/${source.id}`}><p className="eyebrow">Fonte textual</p><h3>{source.title}</h3><time dateTime={source.created_at}>{formatDate(source.created_at)}</time><span className="source-open">Abrir texto →</span></Link></li>)}</ul> : <p>{query ? "Nenhum título corresponde à busca." : "Nenhum texto salvo ainda."}</p>}
      {library.pages > 1 ? <nav className="pagination" aria-label="Páginas da biblioteca">{library.page > 1 ? <Link className="workspace-button neutral" href={libraryUrl(query, library.page - 1)} rel="prev">← Anterior</Link> : null}<span>Página {library.page} de {library.pages}</span>{library.page < library.pages ? <Link className="workspace-button neutral" href={libraryUrl(query, library.page + 1)} rel="next">Próxima →</Link> : null}</nav> : null}
    </section>
  </>;
}
