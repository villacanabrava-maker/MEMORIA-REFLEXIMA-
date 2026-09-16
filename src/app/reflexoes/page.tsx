import Link from "next/link";
import { listReflections } from "@/lib/reflections/data";
import { reflectionStatusLabel } from "@/lib/reflections/validation";
import { formatDate } from "@/lib/sources/data";

export default async function ReflectionsPage() {
  const reflections = await listReflections();
  if (!reflections) return <section className="library-panel"><h2>Não foi possível abrir suas reflexões agora.</h2><p>Seu conteúdo continua preservado.</p></section>;

  return <>
    <section className="library-panel">
      <div className="library-toolbar">
        <div><p className="eyebrow">Reflexão com escolha</p><h2>Transforme contexto em texto revisado por você</h2><p>Cada etapa cria uma versão histórica. Nenhum rascunho de IA é aprovado ou incorporado automaticamente.</p></div>
        <Link className="workspace-button primary" href="/reflexoes/nova">＋ Nova reflexão</Link>
      </div>
    </section>

    <section className="library-panel">
      <div className="section-title"><div><p className="eyebrow">Suas reflexões</p><h2>Processos em andamento e concluídos</h2></div><p className="result-count">{reflections.length.toLocaleString("pt-BR")}</p></div>
      {reflections.length ? <ul className="source-grid">{reflections.map((item) => <li className="source-card" key={item.id}><Link href={`/reflexoes/${item.id}`}>
        <p className="eyebrow">{reflectionStatusLabel(item.status)}</p>
        <h3>{item.title}</h3>
        <small>{item.versionCount} {item.versionCount === 1 ? "versão" : "versões"}</small>
        <time dateTime={item.updatedAt}>Atualizada em {formatDate(item.updatedAt)}</time>
        <span className="source-open">Abrir reflexão →</span>
      </Link></li>)}</ul> : <div><h3>Nenhuma reflexão criada ainda</h3><p>Comece com um tema, texto externo ou pergunta que você queira desenvolver.</p><Link className="workspace-button primary" href="/reflexoes/nova">Criar a primeira reflexão</Link></div>}
    </section>
  </>;
}
