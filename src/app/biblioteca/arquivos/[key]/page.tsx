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

    {isPdf ? <section className="library-panel">
      <p className="eyebrow">Visualização do PDF</p>
      <h3>Documento original</h3>
      <p className="field-help">A visualização usa um acesso temporário assinado ao arquivo privado. O PDF permanece no Storage e não se torna público.</p>
      <iframe className="pdf-preview" src={`/api/arquivos/${encodedKey}?modo=visualizar`} title={`PDF: ${file.name}`} />
    </section> : null}

    <section className="library-panel">
      <p className="eyebrow">Conteúdo do documento</p>
      {extraction.status === "ready" ? <>
        <h3>Texto extraído{extraction.format === "docx" ? " do Word" : ""}</h3>
        {extraction.format === "docx" ? <p className="field-help">O aplicativo leu o texto principal do DOCX. Formatação visual, imagens e elementos complexos não alteram o arquivo original e não são reproduzidos nesta etapa.</p> : null}
        {(extraction.normalizedLineEndings || extraction.removedBom) ? <p className="field-help">O texto foi normalizado apenas para visualização. O arquivo original não foi alterado.</p> : null}
        <div className="source-body">{extraction.input.content}</div>
      </> : <>
        <h3>{isPdf ? "Extração de texto do PDF ainda não ativada" : "Original salvo com segurança"}</h3>
        <p>{extraction.message}</p>
        <p className="field-help">TXT, Markdown e DOCX já podem ser lidos. PDFs já podem ser visualizados com segurança; a próxima etapa adicionará a extração do texto do PDF com limites de páginas e tamanho.</p>
      </>}
    </section>
  </article>;
}
