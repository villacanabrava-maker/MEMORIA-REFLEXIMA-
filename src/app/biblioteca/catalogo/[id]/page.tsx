import { notFound } from "next/navigation";
import { CatalogMetadataForm } from "@/components/catalog-metadata-form";
import { getCatalogItem, kindLabel } from "@/lib/library/catalog";

export const metadata = { title: "Organizar item | Memória Reflexiva" };

export default async function CatalogItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getCatalogItem(id);
  if (!item) notFound();

  return <section className="library-panel">
    <p className="eyebrow">Biblioteca 2.0 · {kindLabel(item.kind)}</p>
    <h2>Organizar “{item.title}”</h2>
    <p>Classifique este conteúdo sem alterar sua origem. Esses metadados vão alimentar filtros, busca, memória e, depois, o Cérebro Autoral.</p>
    <CatalogMetadataForm item={item} />
  </section>;
}
