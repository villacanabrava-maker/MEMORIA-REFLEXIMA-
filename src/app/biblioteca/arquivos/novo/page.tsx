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
    <p className="eyebrow">Upload unificado</p>
    <h2>Adicionar arquivo</h2>
    <p>Este é o único ponto de entrada. Escolha qualquer arquivo com até 50 MB. O original será preservado em área privada; formatos compatíveis poderão receber leitura, extração e organização específicas sem alterar o arquivo enviado.</p>
    <FileUploadForm requestId={randomUUID()} />
  </section>;
}
