import { BrainForm } from "@/components/brain-form";
import { getBrainCreationSources } from "@/lib/brain/data";

export const metadata = { title: "Nova interpretação | Memória Reflexiva" };

export default async function NewBrainInsightPage() {
  const sources = await getBrainCreationSources();
  return <section className="library-panel">
    <p className="eyebrow">Meu Cérebro</p>
    <h2>Registrar uma interpretação</h2>
    <p>Escreva uma hipótese sobre padrões, temas, conceitos ou evolução percebidos no seu acervo. Sempre que possível, ligue a interpretação a uma memória ou evidência.</p>
    <BrainForm memories={sources?.memories ?? []} evidence={sources?.evidence ?? []} />
  </section>;
}
