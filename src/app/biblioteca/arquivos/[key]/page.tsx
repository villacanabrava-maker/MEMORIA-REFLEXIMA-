import Link from "next/link";
import { DeleteFileButton } from "@/components/delete-file-button";
import { extractStoredText, getFile } from "@/lib/files/server";
import { formatFileSize } from "@/lib/files/validation";
import { formatDate } from "@/lib/sources/data";
import "../files.css";

export default async function FilePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const result = await getFile(key);

  if (result.status !== "ready") {
    const message = result.status === "missing"
      ? "Este arquivo não foi encontrado na sua biblioteca."
      : result.status === "disabled"
        ? "A biblioteca de arquivos não está ativa neste ambiente."
        : "Não foi possível abrir este arquivo agora.";
    return <section className="library-panel"><Link className="workspace-button neutral" href="/biblioteca">← Biblioteca</Link><h2>Arquivo indisponível</h2><p>{message}</p></section>;
  }

  const { file } = result;
  const extraction = await extractStoredText(key);
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toUpperCase() : "ARQUIVO";

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
      <a className="workspace-button neutral" href={`/api/arquivos/${encodeURIComponent(file.key)}`}>Baixar original</a>
      <DeleteFileButton fileKey={file.key} name={file.name} />
    </div>

    <section className="library-panel">
      <p className="eyebrow">Conteúdo do documento</p>
      {extraction.status === "ready" ? <>
        <h3>Texto extraído</h3>
        {(extraction.normalizedLineEndings || extraction.removedBom) ? <p className="field-help">O texto foi normalizado apenas para visualização. O arquivo original não foi alterado.</p> : null}
        <div className="source-body">{extraction.input.content}</div>
      </> : <>
        <h3>Original salvo com segurança</h3>
        <p>{extraction.message}</p>
        <p className="field-help">A próxima etapa do projeto ampliará a leitura automática para DOCX e PDF. Formatos sem extrator confiável continuarão disponíveis como original.</p>
      </>}
    </section>
  </article>;
}
