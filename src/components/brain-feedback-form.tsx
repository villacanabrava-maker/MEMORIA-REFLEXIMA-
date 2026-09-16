"use client";

import { useActionState } from "react";
import { saveBrainFeedback } from "@/app/cerebro/actions";
import { FEEDBACK_RATINGS, type BrainFeedbackState } from "@/lib/brain/validation";

const initialState: BrainFeedbackState = { message: "" };

export function BrainFeedbackForm({ insightId }: { insightId: string }) {
  const [state, action, pending] = useActionState(saveBrainFeedback, initialState);
  return <form action={action} className="source-form" aria-busy={pending}>
    <input type="hidden" name="insight_id" value={insightId} />
    <div className="form-status" role="status" aria-live="polite">{state.message}</div>

    <fieldset>
      <legend>Como esta interpretação representa você?</legend>
      {FEEDBACK_RATINGS.map(([value, label]) => <label key={value}><input type="radio" name="rating" value={value} required disabled={pending} /> {label}</label>)}
    </fieldset>
    <p className="field-error">{state.errors?.rating}</p>

    <label htmlFor="brain-feedback-comment">Comentário</label>
    <textarea id="brain-feedback-comment" name="comment" rows={4} maxLength={4000} disabled={pending} placeholder="O que está certo, faltando ou fora de contexto?" />
    <p className="field-error">{state.errors?.comment}</p>

    <label htmlFor="brain-feedback-correction">Como você escreveria melhor?</label>
    <textarea id="brain-feedback-correction" name="correction" rows={6} maxLength={12000} disabled={pending} placeholder="Opcional. Registre uma formulação mais fiel ao que você pensa." />
    <p className="field-error">{state.errors?.correction}</p>

    <button className="workspace-button primary" type="submit" disabled={pending}>{pending ? "Registrando…" : "Registrar minha avaliação"}</button>
    <p className="field-help">Cada avaliação entra no histórico. Avaliações anteriores não são sobrescritas.</p>
  </form>;
}
