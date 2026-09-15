import Link from "next/link";
import { DeleteFileButton } from "@/components/delete-file-button";
import { FilesNotice } from "@/components/files-notice";
import { getFiles } from "@/lib/files/server";
import { formatFileSize } from "@/lib/files/validation";
import { parsePage } from "@/lib/sources/validation";
import { formatDate } from "@/lib/sources/data";
import "./files.css";

export const metadata = { title: "Arquivos originais | Memória Reflexiva" };

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ pagina?: string | string[] }> }) {
  const page = parsePage((await searchParams).pagina);
  const result = await getFiles(page);
  return <>
    <div className="library-toolbar"><div><p className="eyebrow">Preservar antes de processar</p><h2>Arquivos originais</h2></div>{result.status === "ready" ? <Link className="workspace-button primary" href="/biblioteca/arquivos/novo">＋ Adicionar arquivo</Link> : null}</div>
    <p className="files-explanation">Guarde PDFs, textos e Markdown. Nesta etapa, os arquivos não são lidos por IA, não criam memórias e não entram na busca textual.</p>
    {result.status !== "ready" ? <FilesNotice status={result.status} /> : <>
      {result.unknownFiles ? <p role="status" className="field-error">Há itens com formato interno não reconhecido nesta página. Eles não serão abertos automaticamente.</p> : null}
      {result.files.length ? <ul className="file-list">{result.files.map((file) => <li className="file-card" key={file.key}><span className="file-kind">{file.name.split(".").pop()?.toUpperCase()}</span><h3>{file.name}</h3><p>{formatFileSize(file.size)}{file.createdAt && Number.isFinite(Date.parse(file.createdAt)) ? ` · ${formatDate(file.createdAt)}` : ""}</p><small>Original preservado · Sem processamento</small><div className="workspace-actions"><a className="workspace-button neutral" href={`/api/arquivos/${file.key}`}>Baixar original</a><DeleteFileButton fileKey={file.key} name={file.name} /></div></li>)}</ul> : <section className="library-panel"><h2>{page > 1 ? "Nenhum arquivo nesta página" : "Seu primeiro arquivo começa aqui"}</h2><p>{page > 1 ? "A lista pode ter mudado. Volte à primeira página para conferir." : "Adicione um arquivo para preservar o original em uma área privada separada dos textos editáveis."}</p>{page > 1 ? <Link className="workspace-button neutral" href="/biblioteca/arquivos">Primeira página</Link> : null}</section>}
      {page > 1 || result.hasNext ? <nav className="pagination" aria-label="Páginas dos arquivos">{page > 1 ? <Link className="workspace-button neutral" href={`/biblioteca/arquivos?pagina=${page - 1}`}>← Anterior</Link> : null}<span>Página {page}</span>{result.hasNext ? <Link className="workspace-button neutral" href={`/biblioteca/arquivos?pagina=${page + 1}`}>Próxima →</Link> : null}</nav> : null}
    </>}
  </>;
}
