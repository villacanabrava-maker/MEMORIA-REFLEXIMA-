"use client";

import { useActionState } from "react";
import { addReflectionVersion } from "@/app/reflexoes/actions";
import { REFLECTION_STAGES, type ReflectionFormState } from "@/lib/reflections/validation";

const initialState: ReflectionFormState = { message: "" };

export function ReflectionStageForm({ reflectionId }: { reflectionId: string }) {
  const [state, action, pending] = useActionState(addReflectionVersion, initialState);
  return <form action={action} className="source-form" aria-busy={pending}>
    <input type="hidden" name="reflection_id" value={reflectionId} />
    <div className="form-status" role="status" aria-live="polite">{state.message}</div>
    <label htmlFor="reflection-stage">Etapa</label>
    <select id="reflection-stage" name="stage" defaultValue="commentary" disabled={pending} aria-invalid={Boolean(state.errors?.stage)}>
      {REFLECTION_STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
    <p className="field-error">{state.errors?.stage}</p>
    <label htmlFor="reflection-content">Conteúdo desta etapa</label>
    <textarea id="reflection-content" name="content" maxLength={50_000} rows={12} required readOnly={pending} placeholder="Escreva sem apagar versões anteriores. Cada envio cria uma nova versão histórica." aria-invalid={Boolean(state.errors?.content)} />
    <p className="field-help">As etapas 3 (Memórias) e 6 (IA) serão vinculadas por proveniência; a IA continua desativada nesta fase.</p>
    <p className="field-error">{state.errors?.content}</p>
    <button className="workspace-button primary" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar nova versão"}</button>
  </form>;
}
