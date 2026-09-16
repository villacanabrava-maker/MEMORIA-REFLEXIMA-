"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { saveBrainInsight } from "@/app/cerebro/actions";
import type { BrainCreationEvidence, BrainCreationMemory, BrainInsightDetail } from "@/lib/brain/data";
import { BRAIN_STATUSES, BRAIN_TYPES, type BrainFormState } from "@/lib/brain/validation";

const initialState: BrainFormState = { message: "" };

export function BrainForm({
  insight,
  memories,
  evidence,
}: {
  insight?: BrainInsightDetail;
  memories: BrainCreationMemory[];
  evidence: BrainCreationEvidence[];
}) {
  const [title, setTitle] = useState(insight?.title ?? "");
  const [statement, setStatement] = useState(insight?.statement ?? "");
  const [state, action, pending] = useActionState(saveBrainInsight, initialState);
  const baselineTitle = insight?.title ?? "";
  const baselineStatement = insight?.statement ?? "";
  const dirty = title !== baselineTitle || statement !== baselineStatement;

  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  return <form action={action} className="source-form" aria-busy={pending}>
    {insight ? <><input type="hidden" name="id" value={insight.id} /><input type="hidden" name="version" value={insight.updatedAt} /></> : null}
    <div className="form-status" role="status" aria-live="polite">{state.message}</div>

    <label htmlFor="brain-type">Tipo de interpretação</label>
    <select id="brain-type" name="insight_type" defaultValue={insight?.insightType ?? "thinking_pattern"} disabled={pending}>
      {BRAIN_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
    <p className="field-error">{state.errors?.insight_type}</p>

    <label htmlFor="brain-title">Título</label>
    <input id="brain-title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} readOnly={pending} required maxLength={200} placeholder="Ex.: Costumo partir de experiências concretas" />
    <p className="field-error">{state.errors?.title}</p>

    <label htmlFor="brain-statement">Interpretação</label>
    <textarea id="brain-statement" name="statement" value={statement} onChange={(event) => setStatement(event.target.value)} readOnly={pending} required maxLength={12000} rows={10} placeholder="Escreva a interpretação como uma hipótese sobre seu acervo, não como uma verdade absoluta." />
    <p className="field-help">{Array.from(statement).length.toLocaleString("pt-BR")} / 12.000 caracteres.</p>
    <p className="field-error">{state.errors?.statement}</p>

    <label htmlFor="brain-status">Estado</label>
    <select id="brain-status" name="status" defaultValue={insight?.status ?? "draft"} disabled={pending}>
      {BRAIN_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
    <p className="field-help">Confirmar significa que você concorda com esta interpretação neste momento; isso pode ser revisto depois.</p>
    <p className="field-error">{state.errors?.status}</p>

    <fieldset>
      <legend>Base da interpretação</legend>
      <p className="field-help">Opcional. Ligue uma memória e/ou evidência agora. Outras ligações poderão ser acrescentadas depois.</p>
      <label htmlFor="brain-memory">Memória relacionada</label>
      <select id="brain-memory" name="memory_id" defaultValue="" disabled={pending}>
        <option value="">Nenhuma por enquanto</option>
        {memories.map((memory) => <option key={memory.id} value={memory.id}>{memory.title}</option>)}
      </select>

      <label htmlFor="brain-evidence">Evidência documental</label>
      <select id="brain-evidence" name="evidence_id" defaultValue="" disabled={pending}>
        <option value="">Nenhuma por enquanto</option>
        {evidence.map((item) => <option key={item.id} value={item.id}>{item.sourceLabel}</option>)}
      </select>
    </fieldset>

    <div className="library-panel">
      <p className="eyebrow">Origem da interpretação</p>
      <p><strong>{insight?.origin === "ai" ? "Gerada pela IA" : "Registrada manualmente"}</strong></p>
      <p className="field-help">O navegador não pode marcar uma interpretação manual como gerada por IA. Quando a geração automática for ativada, a origem e a versão do modelo serão registradas pelo sistema.</p>
    </div>

    <div className="workspace-actions">
      <button className="workspace-button primary" type="submit" disabled={pending}>{pending ? "Salvando…" : insight ? "Salvar alterações" : "Criar interpretação"}</button>
      <Link className="workspace-button neutral" href={insight ? `/cerebro/${insight.id}` : "/cerebro"} onClick={(event) => { if (pending || (dirty && !window.confirm("Descartar as alterações que ainda não foram salvas?"))) event.preventDefault(); }}>Cancelar</Link>
    </div>
  </form>;
}
