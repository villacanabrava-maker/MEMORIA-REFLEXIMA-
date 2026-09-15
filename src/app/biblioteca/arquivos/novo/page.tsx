import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth/require-user";
import { filesEnabled } from "@/lib/files/server";
import { FileUploadForm } from "@/components/file-upload-form";
import { FilesNotice } from "@/components/files-notice";

export const metadata = { title: "Adicionar arquivo | Memória Reflexiva" };

export default async function NewFilePage() {
  await requireUser();
  if (!filesEnabled()) return <FilesNotice status="disabled" />;
  return <section className="library-panel"><p className="eyebrow">Adicionar original</p><h2>Guarde um arquivo sem alterar seu conteúdo</h2><p>O original será armazenado em área privada. Esta versão não extrai texto de PDFs, não verifica vírus e não processa arquivos por inteligência artificial.</p><FileUploadForm requestId={randomUUID()} /></section>;
}
