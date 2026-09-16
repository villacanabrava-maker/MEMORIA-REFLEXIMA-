import Link from "next/link";
import { parseBrainContextQuery, searchBrainContext } from "@/lib/brain/context";

export const metadata = { title: "Prévia de contexto | Memória Reflexiva" };

export default async function BrainContextPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const query = parseBrainContextQuery(params.q);
  const results = await searchBrainContext(query);

  return <>
    <section className="library-panel">
      <div className="library-toolbar">
        <div>
          <p className="eyebrow">Recuperação controlada</p>
          <h2>Prévia de contexto</h2>
          <p>Pesquise um tema para ver quais Memórias e Evidências seriam candidatas a contexto. Nenhum conteúdo é enviado para IA nesta tela.</p>
        </div>
        <Link className="workspace-button neutral" href="/cerebro">← Meu Cérebro</Link>
      </div>
      <form className="search-form" action="/cerebro/contexto" method="get">
        <div>
          <label htmlFor="brain-context-search">Tema ou ideia</label>
          <input id="brain-context-search" name="q" type="search" defaultValue={query} maxLength={200} placeholder="Ex.: silêncio, esperança, mudança profissional…" />
        </div>
        <button className="workspace-button primary" type="submit">Buscar contexto</button>
        {query ? <Link className="workspace-button neutral" href="/cerebro/contexto">Limpar</Link> : null}
      </form>
    </section>

    <section className="library-panel">
      <div className="section-title"><div><p className="eyebrow">Contexto inspecionável</p><h2>{query ? `Resultados para “${query}”` : "Faça uma busca para começar"}</h2></div>{results ? <span>{results.length}</span> : null}</div>
      {results === null ? <p>Não foi possível pesquisar o contexto agora. Nenhum conteúdo foi alterado.</p> : !query ? <p>Esta etapa permite revisar o contexto antes de qualquer geração automática.</p> : results.length ? <ul className="source-grid">{results.map((result) => <li className="source-card" key={`${result.contextType}:${result.contextId}`}>
        <div className="library-toolbar"><p className="eyebrow">{result.contextType === "memory" ? "Memória" : "Evidência"}</p><span className="file-kind">rank {result.rank.toFixed(3)}</span></div>
        <h3>{result.title}</h3>
        <p>{result.excerpt ? (result.excerpt.length > 900 ? `${result.excerpt.slice(0, 900)}…` : result.excerpt) : "Sem texto complementar."}</p>
        <Link className="source-open" href={result.contextType === "memory" ? `/memoria/${result.contextId}` : "/biblioteca/evidencias"}>{result.contextType === "memory" ? "Abrir memória →" : "Ver evidências →"}</Link>
      </li>)}</ul> : <div><h3>Nenhum contexto encontrado</h3><p>Tente palavras diferentes. A busca atual é textual; a camada semântica virá depois.</p></div>}
    </section>

    <section className="library-panel">
      <p className="eyebrow">Próximo estágio</p>
      <h2>Da recuperação para a sugestão estruturada</h2>
      <p>Quando a integração de IA for ativada, somente itens selecionados e validados deste contexto poderão ser enviados. O sistema registrará a execução, o modelo e as referências usadas antes de criar qualquer insight em estado de rascunho.</p>
    </section>
  </>;
}
