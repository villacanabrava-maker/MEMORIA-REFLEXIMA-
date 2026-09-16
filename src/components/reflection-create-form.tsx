"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createReflection } from "@/app/reflexoes/actions";
import type { ReflectionFormState } from "@/lib/reflections/validation";

const initialState: ReflectionFormState = { message: "" };

export function ReflectionCreateForm() {
  const [state, action, pending] = useActionState(createReflection, initialState);
  return <form action={action} className="source-form" aria-busy={pending}>
    <div className="form-status" role="status" aria-live="polite">{state.message}</div>
    <label htmlFor="reflection-title">Título da reflexão</label>
    <input id="reflection-title" name="title" maxLength={200} required readOnly={pending} placeholder="Ex.: O que mudou na minha forma de pensar sobre esperança?" aria-invalid={Boolean(state.errors?.title)} />
    <p className="field-error">{state.errors?.title}</p>
    <p className="field-help">A reflexão será criada como rascunho. Depois você poderá registrar cada etapa sem apagar as anteriores.</p>
    <div className="workspace-actions">
      <button className="workspace-button primary" type="submit" disabled={pending}>{pending ? "Criando…" : "Criar reflexão"}</button>
      <Link className="workspace-button neutral" href="/reflexoes">Cancelar</Link>
    </div>
  </form>;
}
