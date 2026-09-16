import Link from "next/link";
import { redirect } from "next/navigation";
import {
  catalogUrl,
  getLibraryCatalog,
  kindLabel,
  parseCatalogFilter,
  parseCatalogPage,
  parseCatalogQuery,
  type CatalogFilter,
  type CatalogItem,
} from "@/lib/library/catalog";
import { formatDate } from "@/lib/sources/data";

const FILTERS: Array<{ value: CatalogFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "book", label: "Livros" },
  { value: "reflection", label: "Reflexões" },
  { value: "letter", label: "Cartas" },
  { value: "text", label: "Textos" },
  { value: "document", label: "Documentos" },
  { value: "other", label: "Outros" },
];

function authorshipLabel(item: CatalogItem): string {
  if (item.authorship === "user") return "Autoria própria";
  if (item.authorship === "external") return item.authorName ? `Autor: ${item.authorName}` : "Conteúdo externo";
  if (item.authorship === "mixed") return "Autoria mista";
  if (item.authorship === "ai") return "Conteúdo gerado com IA";
  return "Autoria ainda não revisada";
}

function CatalogCard({ item }: { item: CatalogItem }) {
  const metadata = [item.authorName && item.authorship !== "external" ? item.authorName : null, item.publishedYear ? String(item.publishedYear) : null, item.category, item.theme].filter(Boolean);
  const content = <>
    <div className="library-toolbar">
      <p className="eyebrow">{kindLabel(item.kind)}</p>
      <span className="file-kind">{item.origin === "document" ? "ARQUIVO" : "TEXTO"}</span>
    </div>
    <h3>{item.title}</h3>
    <p>{authorshipLabel(item)}</p>
    {metadata.length ? <small>{metadata.join(" · ")}</small> : null}
    {item.description ? <p>{item.description}</p> : null}
    <time dateTime={item.updatedAt}>Atualizado em {formatDate(item.updatedAt)}</time>
    <span className="source-open">{item.href ? "Abrir conteúdo →" : "Origem indisponível"}</span>
  </>;

  return <li className="source-card">{item.href ? <Link href={item.href}>{content}</Link> : <div>{content}</div>}</li>;
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; tipo?: string | string[]; pagina?: string | string[] }>;
}) {
  const params = await searchParams;
  const filter = parseCatalogFilter(params.tipo);
  const query = parseCatalogQuery(params.q);
  const requestedPage = parseCatalogPage(params.pagina);
  const catalog = await getLibraryCatalog(filter, query, requestedPage);

  if (catalog.status !== "ready") {
    return <section className="library-panel"><h2>Não foi possível abrir o catálogo agora.</h2><p>Seus arquivos e textos continuam preservados. Tente novamente em instantes.</p></section>;
  }

  if (requestedPage !== catalog.page) redirect(catalogUrl(filter, query, catalog.page));

  return <>
    <section className="library-panel">
      <div className="library-toolbar">
        <div>
          <p className="eyebrow">Biblioteca 2.0</p>
          <h2>Todo o seu acervo em um só lugar</h2>
          <p>Arquivos e textos continuam preservados em suas estruturas originais. O catálogo apenas organiza como você os enxerga.</p>
        </div>
        <div className="workspace-actions">
          <Link className="workspace-button neutral" href="/biblioteca/pesquisar">Pesquisar dentro do conteúdo</Link>
          <Link className="workspace-button neutral" href="/biblioteca/novo">＋ Escrever texto</Link>
          <Link className="workspace-button primary" href="/biblioteca/arquivos/novo">＋ Adicionar arquivo</Link>
        </div>
      </div>

      <form className="search-form" action="/biblioteca" method="get">
        {filter !== "all" ? <input type="hidden" name="tipo" value={filter} /> : null}
        <div>
          <label htmlFor="library-search">Buscar no catálogo</label>
          <input id="library-search" name="q" type="search" defaultValue={query} maxLength={200} placeholder="Título do livro, carta, texto…" />
        </div>
        <button className="workspace-button neutral" type="submit">Buscar</button>
        {query ? <Link className="workspace-button neutral" href={catalogUrl(filter)}>Limpar</Link> : null}
      </form>

      <nav className="content-tabs" aria-label="Filtrar a biblioteca por tipo">
        {FILTERS.map((option) => <Link
          key={option.value}
          className={filter === option.value ? "workspace-button primary" : "workspace-button neutral"}
          href={catalogUrl(option.value, query)}
          aria-current={filter === option.value ? "page" : undefined}
        >{option.label}</Link>)}
      </nav>
    </section>

    <section className="library-panel">
      <div className="section-title">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h2>{filter === "all" ? "Minha Biblioteca" : FILTERS.find((item) => item.value === filter)?.label ?? "Minha Biblioteca"}</h2>
        </div>
        <p className="result-count" role="status">{catalog.total.toLocaleString("pt-BR")} {catalog.total === 1 ? "item" : "itens"}</p>
      </div>

      {catalog.items.length
        ? <ul className="source-grid">{catalog.items.map((item) => <CatalogCard key={item.id} item={item} />)}</ul>
        : <div><h3>Nenhum item encontrado</h3><p>{query ? "Tente outro título ou remova alguns filtros." : "Adicione um arquivo ou escreva um texto para começar seu catálogo."}</p></div>}

      {catalog.pages > 1 ? <nav className="pagination" aria-label="Páginas da biblioteca">
        {catalog.page > 1 ? <Link className="workspace-button neutral" href={catalogUrl(filter, query, catalog.page - 1)} rel="prev">← Anterior</Link> : null}
        <span>Página {catalog.page} de {catalog.pages}</span>
        {catalog.page < catalog.pages ? <Link className="workspace-button neutral" href={catalogUrl(filter, query, catalog.page + 1)} rel="next">Próxima →</Link> : null}
      </nav> : null}
    </section>
  </>;
}
