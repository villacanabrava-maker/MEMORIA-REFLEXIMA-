import Link from "next/link";
import { DeleteFileButton } from "@/components/delete-file-button";
import { FileProcessingProgress } from "@/components/file-processing-progress";
import { ensureFileProcessing, getFile, getFileProcessingState } from "@/lib/files/server";
import { formatFileSize } from "@/lib/files/validation";
import { formatDate } from "@/lib/sources/data";
import "../files.css";

export default async function FilePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const result = await getFile(key);

  if (result.status !== "ready") {
    const message = result.status === "missing" ? "Este arquivo não foi encontrado na sua biblioteca." : result.status === "disabled" ? "A biblioteca de arquivos não está ativa neste ambiente." : "Não foi possível abrir este arquivo agora.";
    return <section className="library-panel"><Link className="workspace-button neutral" href="/biblioteca">← Biblioteca</Link><h2>Arquivo indisponível</h2><p>{message}</p></section>;
  }

  const { file } = result;
  await ensureFileProcessing(key, file);
  const processing = await getFileProcessingState(key);
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toUpperCase() : "ARQUIVO";
  const isPdf = /\.pdf$/i.test(file.name);
  const encodedKey = encodeURIComponent(file.key);

  return <article className="library-panel">
    <Link className="workspace-button neutral" href="/biblioteca">← Biblioteca</Link>
    <div className="library-toolbar">
      <div><p className="eyebrow">Documento privado</p><h2>{file.name}</h2></div>
      <span className="file-kind">{extension}</span>
    </div>
    <div className="source-meta">
      <span>{formatFileSize(file.size)}</span>
      {file.createdAt && Number.isFinite(Date.parse(file.createdAt)) ? <span>Adicionado em <time dateTime={file.createdAt}>{formatDate(file.createdAt)}</time></span> : null}
      <span>Original preservado no Supabase Storage</span>
    </div>
    <div className="workspace-actions">
      <a className="workspace-button neutral" href={`/api/arquivos/${encodedKey}`}>Baixar original</a>
      {isPdf ? <a className="workspace-button neutral" href={`/api/arquivos/${encodedKey}?modo=visualizar`} target="_blank" rel="noreferrer">Abrir PDF em nova guia</a> : null}
      <DeleteFileButton fileKey={file.key} name={file.name} />
    </div>

    <FileProcessingProgress fileKey={file.key} initial={processing} />

    {isPdf ? <section className="library-panel">
      <p className="eyebrow">Visualização do PDF</p>
      <h3>Documento original</h3>
      <p className="field-help">A visualização usa acesso temporário assinado. O PDF permanece privado.</p>
      <iframe className="pdf-preview" src={`/api/arquivos/${encodedKey}?modo=visualizar`} title={`PDF: ${file.name}`} />
    </section> : null}

    <section className="library-panel">
      <p className="eyebrow">Conteúdo derivado</p>
      <h3>{processing.status === "completed" ? "Conteúdo extraído" : "Prévia do que já foi processado"}</h3>
      {processing.pagePreview.length ? <div className="source-body">
        {processing.pagePreview.map((page) => <section key={page.pageNumber} className="pdf-text-page"><h4>Página {page.pageNumber}</h4><p>{page.content || "[Página sem texto selecionável]"}</p></section>)}
        {processing.hasMorePreview ? <p className="field-help">A tela mostra apenas uma prévia; o restante fica salvo página a página.</p> : null}
      </div> : processing.chunkPreview.length ? <div className="source-body">
        {processing.chunkPreview.map((chunk) => <section key={chunk.chunkIndex}><h4>{chunk.label ?? `Parte ${chunk.chunkIndex + 1}`}</h4><p>{chunk.content}</p></section>)}
        {processing.hasMorePreview ? <p className="field-help">A tela mostra apenas as primeiras partes; o restante também está armazenado.</p> : null}
      </div> : <p className="field-help">O conteúdo aparecerá aqui quando o processador deste formato produzir texto. O arquivo original continua disponível independentemente disso.</p>}
    </section>
  </article>;
}
