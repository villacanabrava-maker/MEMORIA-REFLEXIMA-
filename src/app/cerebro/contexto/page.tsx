import Link from "next/link";
import { generateBrainInsights } from "../actions";
import { parseBrainContextQuery, searchBrainContext } from "@/lib/brain/context";

export const metadata = { title: "Prévia de contexto | Memória Reflexiva" };

function readParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}

function aiMessage(code: string): string | null {
  switch (code) {
    case "brain_ai_disabled":
    case "provider_not_configured":
      return "A geração por IA ainda não está habilitada no servidor.";
    case "no_context":
      return "Não há Memórias ou Evidências suficientes para gerar uma sugestão rastreável sobre este tema.";
    case "rate_limited":
      return "O limite temporário de gerações foi atingido. Aguarde um pouco e tente novamente.";
    case "provider_401":
    case "provider_403":
      return "O provedor de IA recusou a credencial configurada. Revise a chave do servidor.";
    case "provider_429":
      return "A OpenAI recusou a solicitação por limite de uso ou cota da conta.";
    case "consulta_invalida":
      return "Informe um tema antes de pedir sugestões.";
    case "conexao":
      return "A conexão com o gerador de IA foi interrompida. Nenhum insight foi criado.";
    case "falha":
      return "A geração não pôde ser concluída. Nenhum insight foi incorporado automaticamente à sua memória.";
    default:
      return code ? "A geração não pôde ser concluída. Nenhum insight foi incorporado automaticamente à sua memória." : null;
  }
}

export default async function BrainContextPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; ia?: string | string[] }> }) {
  const params = await searchParams;
  const query = parseBrainContextQuery(params.q);
  const iaCode = readParam(params.ia).slice(0, 80);
  const message = aiMessage(iaCode);
  const results = await searchBrainContext(query);

  return <>
    <section className="library-panel">
      <div className="library-toolbar">
        <div>
          <p className="eyebrow">Recuperação controlada</p>
          <h2>Prévia de contexto</h2>
          <p>Pesquise um tema para ver quais Memórias e Evidências serão candidatas a contexto antes de qualquer geração automática.</p>
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
      {message ? <p role="status" className="form-message">{message}</p> : null}
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

    {query && results && results.length ? <section className="library-panel">
      <p className="eyebrow">Sugestão assistida</p>
      <h2>Gerar rascunhos de interpretação com OpenAI</h2>
      <p>Ao continuar, o servidor enviará à OpenAI somente o tema pesquisado e até 12 Memórias/Evidências recuperadas acima. A resposta usa Structured Outputs e é solicitada com <code>store:false</code>. A política de retenção e segurança do provedor ainda se aplica.</p>
      <p>Os resultados entram em <strong>Meu Cérebro</strong> como <strong>rascunhos</strong>. Eles não viram memória, identidade ou verdade automaticamente. Você continua podendo marcar cada interpretação como correta, parcialmente correta ou incorreta.</p>
      <form action={generateBrainInsights}>
        <input type="hidden" name="query" value={query} />
        <button className="workspace-button primary" type="submit">Gerar rascunhos com IA</button>
      </form>
    </section> : null}

    <section className="library-panel">
      <p className="eyebrow">Rastreabilidade</p>
      <h2>Da recuperação para a sugestão estruturada</h2>
      <p>Cada geração registra a execução, o modelo e as referências usadas. O servidor rejeita qualquer Memória ou Evidência que o modelo tente citar fora do contexto permitido.</p>
    </section>
  </>;
}
