import { ReflectionCreateForm } from "@/components/reflection-create-form";

export const metadata = { title: "Nova reflexão | Memória Reflexiva" };

export default function NewReflectionPage() {
  return <section className="library-panel">
    <p className="eyebrow">Criar Reflexão</p>
    <h2>Comece um novo processo de reflexão</h2>
    <p>Você poderá registrar texto externo, seu comentário, conflitos, plano e revisões em versões separadas. Memórias e IA entram como contexto rastreável, nunca como substituição do seu texto.</p>
    <ReflectionCreateForm />
  </section>;
}
