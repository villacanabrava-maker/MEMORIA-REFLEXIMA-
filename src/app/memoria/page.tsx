import Link from "next/link";
import { listMemories } from "@/lib/memory/data";
import { memoryTypeLabel } from "@/lib/memory/validation";
import { formatDate } from "@/lib/sources/data";

function statusLabel(status: string) {
  if (status === "confirmed") return "Confirmada por mim";
  if (status === "archived") return "Arquivada";
  return "Rascunho";
}

export default async function MemoryPage() {
  const memories = await listMemories();
  if (!memories) return <section className="library-panel"><h2>Não foi possível abrir Minha Memória agora.</h2><p>Nenhum conteúdo da Biblioteca foi alterado.</p></section>;

  return <>
    <section className="library-panel">
      <div className="library-toolbar">
        <div>
          <p className="eyebrow">Camada de compreensão</p>
          <h2>O que merece permanecer na sua memória?</h2>
          <p>Uma memória não é um arquivo nem um trecho bruto. É uma ideia, experiência, conceito ou padrão que você reconhece e pode sustentar com evidências.</p>
        </div>
        <div className="workspace-actions">
          <Link className="workspace-button neutral" href="/biblioteca/evidencias">Ver evidências</Link>
          <Link className="workspace-button primary" href="/memoria/novo">＋ Criar memória</Link>
        </div>
      </div>
    </section>

    <section className="library-panel">
      <div className="section-title"><div><p className="eyebrow">Minha Memória</p><h2>{memories.length.toLocaleString("pt-BR")} {memories.length === 1 ? "memória" : "memórias"}</h2></div></div>
      {memories.length ? <ul className="source-grid">{memories.map((memory) => <li className="source-card" key={memory.id}>
        <Link href={`/memoria/${memory.id}`}>
          <p className="eyebrow">{memoryTypeLabel(memory.nodeType)}</p>
          <h3>{memory.title}</h3>
          <p>{memory.reflection ? memory.reflection.slice(0, 280) + (memory.reflection.length > 280 ? "…" : "") : "Sem reflexão escrita ainda."}</p>
          <small>{statusLabel(memory.status)} · {memory.evidenceCount} {memory.evidenceCount === 1 ? "evidência" : "evidências"}</small>
          <time dateTime={memory.updatedAt}>Atualizada em {formatDate(memory.updatedAt)}</time>
          <span className="source-open">Abrir memória →</span>
        </Link>
      </li>)}</ul> : <div><h3>Ainda não há memórias estruturadas</h3><p>Você pode começar manualmente ou criar uma memória a partir de uma evidência da sua Biblioteca.</p><Link className="workspace-button primary" href="/memoria/novo">Criar a primeira memória</Link></div>}
    </section>
  </>;
}
