"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveMemory } from "@/app/memoria/actions";
import { MEMORY_STATUSES, MEMORY_TYPES, type MemoryFormState } from "@/lib/memory/validation";

const initialState: MemoryFormState = { message: "" };

type ExistingMemory = {
  id: string;
  nodeType: string;
  title: string;
  reflection: string | null;
  status: string;
  updatedAt: string;
};

type InitialEvidence = { id: string; source_label: string; excerpt: string } | null;

export function MemoryForm({ memory, evidence }: { memory?: ExistingMemory; evidence?: InitialEvidence }) {
  const [state, action, pending] = useActionState(saveMemory, initialState);

  return <form action={action} className="source-form" aria-busy={pending}>
    {memory ? <><input type="hidden" name="id" value={memory.id} /><input type="hidden" name="version" value={memory.updatedAt} /></> : null}
    {evidence ? <input type="hidden" name="evidence_id" value={evidence.id} /> : null}
    <div className="form-status" role="status" aria-live="polite">{state.message}</div>

    <label htmlFor="memory-type">O que esta memória representa?</label>
    <select id="memory-type" name="node_type" defaultValue={memory?.nodeType ?? "idea"} disabled={pending} aria-invalid={Boolean(state.errors?.node_type)}>
      {MEMORY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
    <p className="field-error">{state.errors?.node_type}</p>

    <label htmlFor="memory-title">Nome da memória</label>
    <input id="memory-title" name="title" defaultValue={memory?.title ?? ""} maxLength={200} required readOnly={pending} placeholder="Ex.: Esperança, mudança de carreira, silêncio…" aria-invalid={Boolean(state.errors?.title)} />
    <p className="field-error">{state.errors?.title}</p>

    <label htmlFor="memory-reflection">O que isso significa para você?</label>
    <textarea id="memory-reflection" name="reflection" defaultValue={memory?.reflection ?? ""} maxLength={10_000} rows={10} readOnly={pending} placeholder="Escreva sua interpretação, lembrança ou compreensão atual. Isso é separado do texto das evidências." aria-invalid={Boolean(state.errors?.reflection)} />
    <p className="field-help">Esta parte é sua reflexão. As evidências permanecem separadas e rastreáveis.</p>
    <p className="field-error">{state.errors?.reflection}</p>

    <label htmlFor="memory-status">Estado</label>
    <select id="memory-status" name="status" defaultValue={memory?.status ?? "draft"} disabled={pending} aria-invalid={Boolean(state.errors?.status)}>
      {MEMORY_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
    <p className="field-error">{state.errors?.status}</p>

    {evidence ? <section className="library-panel">
      <p className="eyebrow">Evidência que será vinculada</p>
      <h3>{evidence.source_label}</h3>
      <p>{evidence.excerpt.length > 700 ? `${evidence.excerpt.slice(0, 700)}…` : evidence.excerpt}</p>
      <p className="field-help">A memória não copia nem altera esta evidência; apenas cria uma relação rastreável com ela.</p>
    </section> : null}

    <div className="workspace-actions">
      <button className="workspace-button primary" type="submit" disabled={pending}>{pending ? "Salvando…" : memory ? "Salvar memória" : "Criar memória"}</button>
      <Link className="workspace-button neutral" href={memory ? `/memoria/${memory.id}` : "/memoria"}>Cancelar</Link>
    </div>
  </form>;
}
