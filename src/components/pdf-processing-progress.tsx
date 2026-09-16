"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PdfProcessingState } from "@/lib/files/server";

type Props = { fileKey: string; initial: PdfProcessingState };

type BatchResponse = {
  status?: PdfProcessingState["status"];
  totalPages?: number | null;
  processedPages?: number;
  done?: boolean;
  message?: string;
};

function pause(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export function PdfProcessingProgress({ fileKey, initial }: Props) {
  const router = useRouter();
  const stopped = useRef(false);
  const [state, setState] = useState(initial);
  const [message, setMessage] = useState("");

  useEffect(() => {
    stopped.current = false;
    if (state.status === "completed" || state.status === "needs_ocr") return () => { stopped.current = true; };

    async function run() {
      let failures = 0;
      while (!stopped.current) {
        try {
          const response = await fetch(`/api/arquivos/${encodeURIComponent(fileKey)}/processar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
          const body = await response.json() as BatchResponse;
          if (!response.ok) {
            failures += 1;
            setMessage(body.message ?? "O processamento foi interrompido. A retomada preserva o progresso já salvo.");
            if (failures >= 3) break;
            await pause(2000 * failures);
            continue;
          }

          failures = 0;
          const next: PdfProcessingState = {
            ...state,
            status: body.status ?? "processing",
            totalPages: body.totalPages ?? null,
            processedPages: body.processedPages ?? 0,
            lastError: null,
          };
          setState(next);
          setMessage("");
          if (body.done) {
            router.refresh();
            break;
          }
          await pause(250);
        } catch {
          failures += 1;
          setMessage("A conexão foi interrompida. O progresso salvo não será perdido.");
          if (failures >= 3) break;
          await pause(2000 * failures);
        }
      }
    }

    void run();
    return () => { stopped.current = true; };
    // O processamento deve iniciar apenas para este arquivo/estado inicial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey, initial.status]);

  const total = state.totalPages ?? 0;
  const percent = total > 0 ? Math.min(100, (state.processedPages / total) * 100) : 0;
  const done = state.status === "completed" || state.status === "needs_ocr";

  return <section className="library-panel">
    <p className="eyebrow">Extração retomável</p>
    <h3>{state.status === "needs_ocr" ? "PDF digitalizado: OCR necessário" : done ? "Texto do PDF processado" : "Processando livro por páginas"}</h3>
    {total > 0 ? <>
      <progress value={state.processedPages} max={total} aria-label="Progresso da extração do PDF">{percent.toFixed(0)}%</progress>
      <p className="field-help">{state.processedPages.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")} páginas concluídas · {percent.toFixed(0)}%</p>
    </> : <p className="field-help">Identificando páginas e preparando o primeiro lote…</p>}
    {!done ? <p className="field-help">O PDF é processado em pequenos lotes. Você pode sair desta página e voltar depois: o aplicativo continua a partir da última página salva, sem recomeçar o livro.</p> : null}
    {state.status === "needs_ocr" ? <p>O PDF não apresentou texto selecionável. O original está preservado; a próxima camada será OCR página a página.</p> : null}
    {message ? <p className="field-error" role="status">{message}</p> : null}
  </section>;
}
