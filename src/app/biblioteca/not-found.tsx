import Link from "next/link";

export default function SourceNotFound() {
  return <section className="library-panel"><h2>Texto não encontrado</h2><p>O texto não existe, foi excluído ou não está disponível para esta conta.</p><Link className="workspace-button neutral" href="/biblioteca">Voltar à biblioteca</Link></section>;
}
