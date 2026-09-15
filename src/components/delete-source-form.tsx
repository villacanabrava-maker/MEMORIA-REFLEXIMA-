"use client";

import { useActionState } from "react";
import { deleteSource } from "@/app/biblioteca/actions";
import type { FormState } from "@/lib/sources/validation";

const initialState: FormState = { message: "" };

export function DeleteSourceForm({ id, version }: { id: string; version: string }) {
  const [state, action, pending] = useActionState(deleteSource, initialState);
  return (
    <details className="delete-panel">
      <summary>Excluir este texto</summary>
      <p>A exclusão é permanente. Esta versão não tem lixeira nem histórico de versões.</p>
      <form action={action} aria-busy={pending}>
        <input name="id" type="hidden" value={id} />
        <input name="version" type="hidden" value={version} />
        <label className="confirmation"><input type="checkbox" name="confirmation" value="excluir" required disabled={pending} />Entendo que este texto será excluído permanentemente.</label>
        <p role="status" aria-live="polite" className="field-error">{state.message}</p>
        <button className="workspace-button danger" type="submit" disabled={pending}>{pending ? "Excluindo…" : "Confirmar exclusão"}</button>
      </form>
    </details>
  );
}
