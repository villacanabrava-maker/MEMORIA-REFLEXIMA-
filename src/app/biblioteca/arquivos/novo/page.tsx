import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth/require-user";
import { filesEnabled } from "@/lib/files/server";
import { FileUploadForm } from "@/components/file-upload-form";
import { FilesNotice } from "@/components/files-notice";

export const metadata = { title: "Adicionar arquivo | Memória Reflexiva" };

export default async function NewFilePage() {
  await requireUser();
  if (!filesEnabled()) return <FilesNotice status="disabled" />;
  return <section className="library-panel">
    <p className="eyebrow">Entrada única de arquivos</p>
    <h2>Adicione PDF, TXT ou Markdown no mesmo lugar</h2>
    <p>Escolha o arquivo uma única vez. O aplicativo preserva o original em área privada e depois organiza automaticamente por tipo. TXT e Markdown poderão ser transformados em texto editável; PDF permanece no mesmo fluxo e receberá extração própria na etapa seguinte.</p>
    <FileUploadForm requestId={randomUUID()} />
  </section>;
}
