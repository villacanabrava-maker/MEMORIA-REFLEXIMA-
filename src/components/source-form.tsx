"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { saveSource } from "@/app/biblioteca/actions";
import { characterCount, MAX_CONTENT, MAX_TITLE, type FormState, type SourceInput } from "@/lib/sources/validation";
import type { Source } from "@/lib/sources/data";

const initialState: FormState = { message: "" };

export function SourceForm({ source, initialInput }: { source?: Source; initialInput?: SourceInput }) {
  const [title, setTitle] = useState(source?.title ?? initialInput?.title ?? "");
  const [content, setContent] = useState(source?.content ?? initialInput?.content ?? "");
  const [state, action, pending] = useActionState(saveSource, initialState);
  // Imported text is unsaved immediately. It must not be treated as a saved baseline.
  const dirty = title !== (source?.title ?? "") || content !== (source?.content ?? "");
  const titleLength = characterCount(title.trim());
  const contentLength = characterCount(content);
  const tooLong = titleLength > MAX_TITLE || contentLength > MAX_CONTENT;
  const cancelUrl = source ? `/biblioteca/${source.id}` : "/biblioteca";

  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  return (
    <form action={action} className="source-form" aria-busy={pending}>
      {source ? <><input type="hidden" name="id" value={source.id} /><input type="hidden" name="version" value={source.updated_at} /></> : null}
      <div className="form-status" role="status" aria-live="polite">{state.message}</div>
      <label htmlFor="source-title">Título</label>
      <input id="source-title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} readOnly={pending} required maxLength={MAX_TITLE * 2} aria-invalid={Boolean(state.errors?.title) || titleLength > MAX_TITLE} aria-describedby="title-help title-error" placeholder="Como você quer encontrar este texto depois?" />
      <p id="title-help" className="field-help">{titleLength} / 200 caracteres.</p>
      <p id="title-error" className="field-error">{state.errors?.title}</p>
      <label htmlFor="source-content">{initialInput ? "Texto importado para revisão" : "Texto original"}</label>
      <textarea id="source-content" name="content" value={content} onChange={(event) => setContent(event.target.value)} readOnly={pending} required maxLength={MAX_CONTENT * 2} rows={16} aria-invalid={Boolean(state.errors?.content) || contentLength > MAX_CONTENT} aria-describedby="content-help content-error" placeholder="Cole ou escreva seu texto. Ele será guardado sem resumo ou processamento por inteligência artificial." />
      <p id="content-help" className="field-help">{contentLength.toLocaleString("pt-BR")} / 100.000 caracteres. Será salvo o texto deste formulário.</p>
      <p id="content-error" className="field-error">{state.errors?.content}</p>
      {tooLong ? <p className="field-error" role="alert">Reduza o texto ou o título para respeitar os limites.</p> : null}
      <div className="workspace-actions">
        <button className="workspace-button primary" type="submit" disabled={pending || tooLong}>{pending ? "Salvando…" : source ? "Salvar alterações" : "Guardar texto"}</button>
        <Link className="workspace-button neutral" href={cancelUrl} onClick={(event) => { if (pending || (dirty && !window.confirm("Descartar as alterações que ainda não foram salvas?"))) event.preventDefault(); }}>Cancelar</Link>
      </div>
    </form>
  );
}
