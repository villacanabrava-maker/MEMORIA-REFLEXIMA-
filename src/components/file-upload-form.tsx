"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatFileSize, validateFileMetadata } from "@/lib/files/validation";

export function FileUploadForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [selection, setSelection] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const body = new FormData(form);
    const file = body.get("file");
    if (!(file instanceof File)) { setMessage("Selecione um arquivo."); return; }
    const validation = validateFileMetadata(file.name, file.size);
    if (!validation.ok) { setMessage(validation.message); return; }
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/arquivos", { method: "POST", body, credentials: "same-origin", redirect: "error" });
      const data = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) { setMessage(data.message ?? "Não foi possível confirmar o envio."); return; }
      setMessage("Original guardado. Abrindo a lista…");
      router.push("/biblioteca/arquivos");
      router.refresh();
    } catch {
      setMessage("A conexão foi interrompida. Tente novamente sem trocar o arquivo para verificar a mesma tentativa.");
    } finally {
      setPending(false);
    }
  }

  return <form className="source-form" onSubmit={submit} aria-busy={pending}>
    <input type="hidden" name="requestId" value={requestId} />
    <label htmlFor="original-file">Arquivo original</label>
    <input id="original-file" type="file" name="file" accept=".pdf,.txt,.md" required disabled={pending} aria-describedby="file-help file-status" onChange={(event) => { const file = event.target.files?.[0]; setSelection(file ? `${file.name} · ${formatFileSize(file.size)}` : ""); setMessage(""); }} />
    <p id="file-help" className="field-help">PDF, TXT e Markdown (.md). Até 2 MB. Textos precisam estar em UTF-8.</p>
    {selection ? <p className="file-selection">{selection}</p> : null}
    <p id="file-status" className="form-status" role="status" aria-live="polite">{pending ? "Enviando e verificando o original…" : message}</p>
    <div className="workspace-actions"><button type="submit" className="workspace-button primary" disabled={pending}>{pending ? "Enviando…" : "Guardar arquivo"}</button><Link className="workspace-button neutral" href="/biblioteca/arquivos" onClick={(event) => { if (pending) event.preventDefault(); }}>Voltar aos arquivos</Link></div>
  </form>;
}
