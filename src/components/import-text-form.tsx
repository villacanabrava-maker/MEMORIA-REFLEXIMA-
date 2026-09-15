"use client";

import { useRef, useState } from "react";
import { decodeTextFile, validateTextFile, type TextImportResult } from "@/lib/sources/validation";
import { SourceForm } from "./source-form";

type Imported = Extract<TextImportResult, { ok: true }>;

export function ImportTextForm() {
  const [imported, setImported] = useState<Imported | null>(null);
  const [filename, setFilename] = useState("");
  const [message, setMessage] = useState("");
  const [reading, setReading] = useState(false);
  const busy = useRef(false);

  async function readFile(file: File | undefined) {
    if (!file || busy.current || imported) return;
    const metadata = validateTextFile(file.name, file.size);
    if (!metadata.ok) { setMessage(metadata.message); return; }
    busy.current = true;
    setReading(true);
    setMessage("");
    try {
      // No upload occurs here. Bytes remain in this browser until the user saves text.
      const result = decodeTextFile(file.name, new Uint8Array(await file.arrayBuffer()));
      if (!result.ok) { setMessage(result.message); return; }
      setFilename(file.name);
      setImported(result);
      setMessage("Texto lido no navegador. Revise o título e o conteúdo; nada foi salvo ainda.");
    } catch {
      setMessage("Não foi possível ler este arquivo. Tente selecioná-lo novamente.");
    } finally {
      busy.current = false;
      setReading(false);
    }
  }

  return <div className="text-import">
    {!imported ? <div className="import-picker">
      <span className="import-step" aria-hidden="true">01</span>
      <div><label htmlFor="text-file">Escolha seu arquivo de texto</label>
      <p id="text-file-help">TXT ou Markdown (.md), em UTF-8. Até 400 KB e 100.000 caracteres.</p>
      <input id="text-file" type="file" accept=".txt,.md" disabled={reading} aria-describedby="text-file-help import-status" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void readFile(file); }} />
      </div>
    </div> : <div className="import-summary"><span className="import-step" aria-hidden="true">02</span><div><strong>Revise antes de guardar</strong><p>{filename}</p></div><span className="import-unsaved">Ainda não salvo</span></div>}
    <p className="import-status" id="import-status" role="status" aria-live="polite">{reading ? "Lendo o arquivo no seu navegador…" : message}</p>
    {imported ? <>
      {(imported.normalizedLineEndings || imported.removedBom) ? <p className="field-help">Conversões de texto: {imported.normalizedLineEndings ? "quebras de linha padronizadas" : ""}{imported.normalizedLineEndings && imported.removedBom ? "; " : ""}{imported.removedBom ? "marcador UTF-8 inicial removido" : ""}. Nenhum trecho foi resumido ou cortado.</p> : null}
      <SourceForm initialInput={imported.value} />
    </> : null}
    <noscript>Ative o JavaScript para ler um arquivo no navegador. A tela Adicionar texto permite colar o conteúdo manualmente.</noscript>
  </div>;
}
