"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveCatalogMetadata } from "@/app/biblioteca/catalogo/actions";
import {
  CATALOG_AUTHORSHIP_OPTIONS,
  CATALOG_AUTHOR_MAX,
  CATALOG_DESCRIPTION_MAX,
  CATALOG_KIND_OPTIONS,
  CATALOG_SHORT_MAX,
  CATALOG_TITLE_MAX,
  type CatalogMetadataFormState,
} from "@/lib/library/metadata";

const initialState: CatalogMetadataFormState = { message: "" };

type Item = {
  id: string;
  title: string;
  kind: string;
  authorship: string;
  authorName: string | null;
  publishedYear: number | null;
  category: string | null;
  theme: string | null;
  description: string | null;
  retrievalEnabled: boolean;
  updatedAt: string;
  href: string | null;
};

export function CatalogMetadataForm({ item }: { item: Item }) {
  const [state, action, pending] = useActionState(saveCatalogMetadata, initialState);

  return <form action={action} className="source-form" aria-busy={pending}>
    <input type="hidden" name="id" value={item.id} />
    <input type="hidden" name="version" value={item.updatedAt} />

    <div className="form-status" role="status" aria-live="polite">{state.message}</div>

    <label htmlFor="catalog-title">Título na Biblioteca</label>
    <input id="catalog-title" name="title" defaultValue={item.title} required maxLength={CATALOG_TITLE_MAX} readOnly={pending} aria-invalid={Boolean(state.errors?.title)} />
    <p className="field-help">Este título organiza o catálogo. O nome do arquivo original não é alterado.</p>
    <p className="field-error">{state.errors?.title}</p>

    <label htmlFor="catalog-kind">Tipo de conteúdo</label>
    <select id="catalog-kind" name="kind" defaultValue={item.kind} disabled={pending} aria-invalid={Boolean(state.errors?.kind)}>
      {CATALOG_KIND_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
    <p className="field-error">{state.errors?.kind}</p>

    <label htmlFor="catalog-authorship">Autoria</label>
    <select id="catalog-authorship" name="authorship" defaultValue={item.authorship} disabled={pending} aria-invalid={Boolean(state.errors?.authorship)}>
      {CATALOG_AUTHORSHIP_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
    <p className="field-help">Essa informação será usada mais adiante para impedir que o “Meu Cérebro” confunda conteúdo externo ou gerado por IA com sua autoria.</p>
    <p className="field-error">{state.errors?.authorship}</p>

    <label htmlFor="catalog-author">Autor ou autora</label>
    <input id="catalog-author" name="author_name" defaultValue={item.authorName ?? ""} maxLength={CATALOG_AUTHOR_MAX} readOnly={pending} placeholder="Ex.: Nicolau Maquiavel" aria-invalid={Boolean(state.errors?.author_name)} />
    <p className="field-error">{state.errors?.author_name}</p>

    <label htmlFor="catalog-year">Ano</label>
    <input id="catalog-year" name="published_year" type="number" min={-5000} max={3000} defaultValue={item.publishedYear ?? ""} readOnly={pending} placeholder="Ex.: 1532" aria-invalid={Boolean(state.errors?.published_year)} />
    <p className="field-error">{state.errors?.published_year}</p>

    <label htmlFor="catalog-category">Categoria</label>
    <input id="catalog-category" name="category" defaultValue={item.category ?? ""} maxLength={CATALOG_SHORT_MAX} readOnly={pending} placeholder="Ex.: Filosofia política" aria-invalid={Boolean(state.errors?.category)} />
    <p className="field-error">{state.errors?.category}</p>

    <label htmlFor="catalog-theme">Tema principal</label>
    <input id="catalog-theme" name="theme" defaultValue={item.theme ?? ""} maxLength={CATALOG_SHORT_MAX} readOnly={pending} placeholder="Ex.: Poder e governo" aria-invalid={Boolean(state.errors?.theme)} />
    <p className="field-error">{state.errors?.theme}</p>

    <label htmlFor="catalog-description">Observação</label>
    <textarea id="catalog-description" name="description" defaultValue={item.description ?? ""} maxLength={CATALOG_DESCRIPTION_MAX} rows={5} readOnly={pending} placeholder="Uma observação para você lembrar por que este item é importante." aria-invalid={Boolean(state.errors?.description)} />
    <p className="field-error">{state.errors?.description}</p>

    <label className="checkbox-row">
      <input type="checkbox" name="retrieval_enabled" defaultChecked={item.retrievalEnabled} disabled={pending} />
      <span>Permitir que este item participe das buscas e recuperações futuras.</span>
    </label>

    <div className="library-panel">
      <p className="eyebrow">Proteção da origem</p>
      <p>Organizar este item não modifica o arquivo, o texto original, as páginas extraídas nem as evidências. Estamos alterando somente os metadados do catálogo.</p>
    </div>

    <div className="workspace-actions">
      <button className="workspace-button primary" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar organização"}</button>
      {item.href ? <Link className="workspace-button neutral" href={item.href}>Abrir conteúdo</Link> : null}
      <Link className="workspace-button neutral" href="/biblioteca">Cancelar</Link>
    </div>
  </form>;
}
