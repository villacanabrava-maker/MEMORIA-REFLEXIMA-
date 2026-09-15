"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteFileButton({ fileKey, name }: { fileKey: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function remove() {
    if (pending || !window.confirm(`Excluir permanentemente “${name}”? Esta versão não possui lixeira.`)) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/arquivos/${fileKey}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "excluir" }),
        credentials: "same-origin",
        redirect: "error",
      });
      const data = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) { setMessage(data.message ?? "Não foi possível confirmar a exclusão."); return; }
      setMessage("Arquivo removido.");
      router.refresh();
    } catch {
      setMessage("A conexão foi interrompida. Recarregue a lista antes de repetir a exclusão.");
    } finally {
      setPending(false);
    }
  }
  return <div><button type="button" className="workspace-button danger" disabled={pending} onClick={remove}>{pending ? "Excluindo…" : "Excluir"}</button>{message ? <p className="field-error" role="status">{message}</p> : null}</div>;
}
