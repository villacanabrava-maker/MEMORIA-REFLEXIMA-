import Link from "next/link";
import { DeleteFileButton } from "@/components/delete-file-button";
import { FilesNotice } from "@/components/files-notice";
import { getFiles, type LibraryFile } from "@/lib/files/server";
import { formatFileSize } from "@/lib/files/validation";
import { parsePage } from "@/lib/sources/validation";
import { formatDate } from "@/lib/sources/data";
import "./files.css";

export const metadata = { title: "Arquivos | Memória Reflexiva" };

function FileCards({ files }: { files: LibraryFile[] }) {
  return <ul className="file-list">{files.map((file) => <li className="file-card" key={file.key}>
    <span className="file-kind">{file.name.split(".").pop()?.toUpperCase()}</span>
    <h3>{file.name}</h3>
    <p>{formatFileSize(file.size)}{file.createdAt && Number.isFinite(Date.parse(file.createdAt)) ? ` · ${formatDate(file.createdAt)}` : ""}</p>
    <small>Original preservado em área privada</small>
    <div className="workspace-actions">
      <a className="workspace-button neutral" href={`/api/arquivos/${file.key}`}>Baixar original</a>
      <DeleteFileButton fileKey={file.key} name={file.name} />
    </div>
  </li>)}</ul>;
}

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ pagina?: string | string[] }> }) {
  const page = parsePage((await searchParams).pagina);
  const result = await getFiles(page);
  const pdfs = result.status === "ready" ? result.files.filter((file) => /\.pdf$/i.test(file.name)) : [];
  const wordDocs = result.status === "ready" ? result.files.filter((file) => /\.(doc|docx|odt|rtf|pages)$/i.test(file.name)) : [];
  const textDocs = result.status === "ready" ? result.files.filter((file) => /\.(txt|md|csv)$/i.test(file.name)) : [];

  return <>
    <div className="library-toolbar"><div><p className="eyebrow">Tudo em um só lugar</p><h2>Arquivos</h2></div>{result.status === "ready" ? <Link className="workspace-button primary" href="/biblioteca/arquivos/novo">＋ Adicionar arquivo</Link> : null}</div>
    <p className="files-explanation">Use o mesmo botão para PDF, Word, ODT, RTF, Pages, TXT, Markdown e CSV. O aplicativo guarda o original de forma privada e organiza automaticamente por família.</p>
    {result.status !== "ready" ? <FilesNotice status={result.status} /> : <>
      {result.unknownFiles ? <p role="status" className="field-error">Há itens com formato interno não reconhecido nesta página. Eles não serão abertos automaticamente.</p> : null}
      {result.files.length ? <>
        {pdfs.length ? <section className="library-panel"><p className="eyebrow">Documentos</p><h2>PDFs</h2><p>Documentos preservados para leitura e extração estruturada na próxima etapa.</p><FileCards files={pdfs} /></section> : null}
        {wordDocs.length ? <section className="library-panel"><p className="eyebrow">Editores de texto</p><h2>Word e outros documentos</h2><p>DOC, DOCX, ODT, RTF e Pages ficam juntos e preservados no formato original.</p><FileCards files={wordDocs} /></section> : null}
        {textDocs.length ? <section className="library-panel"><p className="eyebrow">Textos e dados</p><h2>TXT, Markdown e CSV</h2><p>Formatos textuais preservados e preparados para leitura segura quando compatível.</p><FileCards files={textDocs} /></section> : null}
      </> : <section className="library-panel"><h2>{page > 1 ? "Nenhum arquivo nesta página" : "Seu primeiro arquivo começa aqui"}</h2><p>{page > 1 ? "A lista pode ter mudado. Volte à primeira página para conferir." : "Clique em Adicionar arquivo e escolha qualquer formato escrito compatível no mesmo lugar."}</p>{page > 1 ? <Link className="workspace-button neutral" href="/biblioteca/arquivos">Primeira página</Link> : <Link className="workspace-button primary" href="/biblioteca/arquivos/novo">Adicionar arquivo</Link>}</section>}
      {page > 1 || result.hasNext ? <nav className="pagination" aria-label="Páginas dos arquivos">{page > 1 ? <Link className="workspace-button neutral" href={`/biblioteca/arquivos?pagina=${page - 1}`}>← Anterior</Link> : null}<span>Página {page}</span>{result.hasNext ? <Link className="workspace-button neutral" href={`/biblioteca/arquivos?pagina=${page + 1}`}>Próxima →</Link> : null}</nav> : null}
    </>}
  </>;
}
