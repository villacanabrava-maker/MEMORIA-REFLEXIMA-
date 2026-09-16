"use client";

import { useEffect, useState } from "react";
import type { FileProcessingState } from "@/lib/files/server";

function pause(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function titleFor(state: FileProcessingState) {
  if (state.status === "queued") return "Na fila de processamento";
  if (state.status === "processing") return "Processando em segundo plano";
  if (state.status === "completed") return "Conteúdo processado";
  if (state.status === "needs_ocr") return "OCR necessário";
  if (state.status === "needs_transcription") return "Transcrição necessária";
  if (state.status === "preserved") return "Original preservado";
  if (state.status === "error") return "Processamento interrompido";
  return "Preparando processamento";
}

export function FileProcessingProgress({ fileKey, initial }: { fileKey: string; initial: FileProcessingState }) {
  const [state, setState] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    const terminal = new Set(["completed", "needs_ocr", "needs_transcription", "preserved"]);
    if (terminal.has(initial.status)) return;

    async function poll() {
      while (!cancelled) {
        await pause(2500);
        try {
          const response = await fetch(`/api/arquivos/${encodeURIComponent(fileKey)}/processar`, { cache: "no-store" });
          if (!response.ok) continue;
          const next = await response.json() as FileProcessingState;
          if (cancelled) return;
          setState(next);
          if (terminal.has(next.status)) return;
        } catch { /* a próxima consulta tenta novamente */ }
      }
    }
    void poll();
    return () => { cancelled = true; };
  }, [fileKey, initial.status]);

  const total = state.totalPages ?? 0;
  const percent = total > 0 ? Math.min(100, (state.processedPages / total) * 100) : null;

  return <section className="library-panel">
    <p className="eyebrow">Processamento automático</p>
    <h3>{titleFor(state)}</h3>
    {percent !== null ? <>
      <progress value={state.processedPages} max={total} aria-label="Progresso do processamento">{percent.toFixed(0)}%</progress>
      <p className="field-help">{state.processedPages.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")} páginas · {percent.toFixed(0)}%</p>
    </> : null}
    {state.status === "queued" || state.status === "processing" || state.status === "pending" || state.status === "not_started" ? <p className="field-help">Você pode fechar esta página. O trabalho fica na fila do Supabase e continua sem depender do navegador aberto.</p> : null}
    {state.status === "needs_ocr" ? <p>O arquivo é uma imagem ou não possui texto selecionável. O original está preservado e marcado para OCR.</p> : null}
    {state.status === "needs_transcription" ? <p>O arquivo de áudio ou vídeo está preservado e marcado para a camada de transcrição.</p> : null}
    {state.status === "preserved" ? <p>Este formato ainda não possui um extrator automático seguro. O arquivo permanece disponível para visualização ou download.</p> : null}
    {state.lastError ? <p className={state.status === "error" ? "field-error" : "field-help"} role="status">{state.lastError}</p> : null}
  </section>;
}
