import { MemoryForm } from "@/components/memory-form";
import { getEvidenceForMemoryCreation } from "@/lib/memory/data";

export const metadata = { title: "Nova memória | Memória Reflexiva" };

export default async function NewMemoryPage({ searchParams }: { searchParams: Promise<{ evidencia?: string }> }) {
  const params = await searchParams;
  const evidence = await getEvidenceForMemoryCreation(params.evidencia);

  return <section className="library-panel">
    <p className="eyebrow">Minha Memória</p>
    <h2>{evidence ? "Transformar evidência em memória" : "Criar uma memória"}</h2>
    <p>Registre sua compreensão sem alterar a fonte. A memória representa o que você reconhece naquele conteúdo; a evidência continua sendo a prova documental separada.</p>
    <MemoryForm evidence={evidence} />
  </section>;
}
