import { notFound } from "next/navigation";
import { BrainForm } from "@/components/brain-form";
import { getBrainCreationSources, getBrainInsight } from "@/lib/brain/data";

export const metadata = { title: "Editar interpretação | Memória Reflexiva" };

export default async function EditBrainInsightPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [insight, sources] = await Promise.all([getBrainInsight(id), getBrainCreationSources()]);
  if (!insight) notFound();
  return <section className="library-panel">
    <p className="eyebrow">Meu Cérebro</p>
    <h2>Revisar interpretação</h2>
    <p>Editar esta interpretação não altera memórias, evidências nem arquivos de origem.</p>
    <BrainForm insight={insight} memories={sources?.memories ?? []} evidence={sources?.evidence ?? []} />
  </section>;
}
