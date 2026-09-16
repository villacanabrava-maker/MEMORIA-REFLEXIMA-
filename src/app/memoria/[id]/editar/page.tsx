import { notFound } from "next/navigation";
import { MemoryForm } from "@/components/memory-form";
import { getMemory } from "@/lib/memory/data";

export const metadata = { title: "Editar memória | Memória Reflexiva" };

export default async function EditMemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memory = await getMemory(id);
  if (!memory) notFound();

  return <section className="library-panel">
    <p className="eyebrow">Minha Memória</p>
    <h2>Editar “{memory.title}”</h2>
    <p>Editar esta reflexão não modifica as evidências nem as fontes originais ligadas a ela.</p>
    <MemoryForm memory={memory} />
  </section>;
}
