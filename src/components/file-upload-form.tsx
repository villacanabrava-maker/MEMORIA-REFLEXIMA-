"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { formatFileSize, validateFileMetadata } from "@/lib/files/validation";
import { resumableUpload } from "@/lib/files/tus";

export function FileUploadForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState(""); const [selection, setSelection] = useState(""); const [pending, setPending] = useState(false); const [progress, setProgress] = useState(0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const file = new FormData(event.currentTarget).get("file");
    if (!(file instanceof File)) { setMessage("Selecione um arquivo."); return; }
    const validation = validateFileMetadata(file.name, file.size); if (!validation.ok) { setMessage(validation.message); return; }
    setPending(true); setMessage(""); setProgress(0);
    try {
      const key = await resumableUpload(file, requestId, setProgress);
      setMessage("Arquivo guardado. Colocando na fila de processamento…");
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.rpc("enqueue_library_file_processing", { p_storage_key: key, p_file_name: file.name, p_mime_type: file.type || null, p_file_size: file.size, p_force: false });
      if (error) throw new Error("O arquivo foi salvo, mas não entrou na fila automática. Abra o arquivo na Biblioteca para tentar novamente.");
      setMessage("Arquivo salvo e enfileirado. Abrindo o documento…");
      router.push(`/biblioteca/arquivos/${encodeURIComponent(key)}`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível concluir o envio."); setPending(false); }
  }
  return <form className="source-form" onSubmit={submit} aria-busy={pending}>
    <label htmlFor="original-file">Escolha qualquer arquivo</label>
    <input id="original-file" type="file" name="file" required disabled={pending} aria-describedby="file-help file-status" onChange={(event) => { const file = event.target.files?.[0]; setSelection(file ? `${file.name} · ${formatFileSize(file.size)}` : ""); setMessage(""); setProgress(0); }} />
    <p id="file-help" className="field-help">Um único botão para qualquer formato, com até 50 MB. Depois do upload, o arquivo entra automaticamente na fila em segundo plano; você pode fechar a página e voltar depois.</p>
    {selection ? <p className="file-selection">{selection}</p> : null}
    {pending ? <progress value={progress} max={100} aria-label="Progresso do upload">{progress.toFixed(0)}%</progress> : null}
    <p id="file-status" className="form-status" role="status" aria-live="polite">{pending ? `Enviando… ${progress.toFixed(0)}%` : message}</p>
    <div className="workspace-actions"><button type="submit" className="workspace-button primary" disabled={pending}>{pending ? "Enviando…" : "Adicionar arquivo"}</button><Link className="workspace-button neutral" href="/biblioteca" onClick={(event) => { if (pending) event.preventDefault(); }}>Voltar à biblioteca</Link></div>
  </form>;
}
