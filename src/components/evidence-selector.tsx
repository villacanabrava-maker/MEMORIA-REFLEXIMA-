"use client";

import { useRef, useState } from "react";
import { saveEvidence } from "@/app/biblioteca/evidencias/actions";

type Span = { start: number; end: number; preview: string };

export function EvidenceSelector({
  fileKey,
  kind,
  index,
  content,
}: {
  fileKey: string;
  kind: "page" | "chunk";
  index: number;
  content: string;
}) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [span, setSpan] = useState<Span | null>(null);

  function captureSelection() {
    const element = textRef.current;
    const selection = window.getSelection();
    if (!element || !selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) return;

    const prefix = document.createRange();
    prefix.selectNodeContents(element);
    prefix.setEnd(range.startContainer, range.startOffset);

    const start = Array.from(prefix.toString()).length;
    const selected = range.toString();
    const length = Array.from(selected).length;
    if (length < 1 || length > 20_000) return;

    setSpan({ start, end: start + length, preview: selected.length > 180 ? `${selected.slice(0, 177)}…` : selected });
  }

  function clearSelection() {
    setSpan(null);
    window.getSelection()?.removeAllRanges();
  }

  return <div>
    <p
      ref={textRef}
      onMouseUp={captureSelection}
      onKeyUp={captureSelection}
      onTouchEnd={captureSelection}
      tabIndex={0}
    >{content}</p>

    <p className="field-help">Selecione uma passagem do texto para guardar apenas aquele trecho. Sem seleção, a fonte inteira será usada como evidência quando couber no limite.</p>

    {span ? <div className="library-panel" role="status">
      <p className="eyebrow">Trecho selecionado · {(span.end - span.start).toLocaleString("pt-BR")} caracteres</p>
      <p>“{span.preview}”</p>
      <button className="workspace-button neutral" type="button" onClick={clearSelection}>Limpar seleção</button>
    </div> : null}

    <form action={saveEvidence}>
      <input type="hidden" name="key" value={fileKey} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="index" value={index} />
      {span ? <>
        <input type="hidden" name="start_offset" value={span.start} />
        <input type="hidden" name="end_offset" value={span.end} />
      </> : null}
      <button className="workspace-button neutral" type="submit">{span ? "Salvar trecho como evidência" : "Salvar fonte inteira como evidência"}</button>
    </form>
  </div>;
}
