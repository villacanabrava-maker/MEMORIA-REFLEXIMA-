import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { formatDate } from "@/lib/sources/data";

export const metadata = { title: "Evidências | Memória Reflexiva" };

type EvidenceRow = {
  id: string;
  source_label: string;
  excerpt: string;
  created_at: string;
  document_id: string;
};

type DocumentRow = { id: string; storage_key: string; file_name: string };

export default async function EvidencePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const { data: evidence } = await supabase.from("library_evidence")
    .select("id,source_label,excerpt,created_at,document_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (evidence ?? []) as EvidenceRow[];
  const documentIds = [...new Set(rows.map((row) => row.document_id))];
  const { data: documents } = documentIds.length
    ? await supabase.from("library_documents").select("id,storage_key,file_name").eq("user_id", user.id).in("id", documentIds)
    : { data: [] as DocumentRow[] };
  const byId = new Map(((documents ?? []) as DocumentRow[]).map((doc) => [doc.id, doc]));

  return <section className="library-panel">
    <div className="library-toolbar">
      <div><p className="eyebrow">Conhecimento rastreável</p><h2>Evidências</h2></div>
      <Link className="workspace-button neutral" href="/biblioteca">← Biblioteca</Link>
    </div>
    <p className="files-explanation">Cada evidência é copiada diretamente de uma página ou parte processada e mantém vínculo com o arquivo original.</p>
    {params.status === "invalida" ? <p className="field-error" role="status">A origem desta evidência não pôde ser validada.</p> : null}
    {rows.length ? <ul className="source-grid">{rows.map((row) => {
      const document = byId.get(row.document_id);
      return <li className="source-card" key={row.id}>
        <p className="eyebrow">Evidência</p>
        <h3>{row.source_label}</h3>
        <p>{row.excerpt.length > 800 ? `${row.excerpt.slice(0, 800)}…` : row.excerpt}</p>
        <time dateTime={row.created_at}>{formatDate(row.created_at)}</time>
        {document ? <Link className="source-open" href={`/biblioteca/arquivos/${encodeURIComponent(document.storage_key)}`}>Abrir origem →</Link> : null}
      </li>;
    })}</ul> : <p>Nenhuma evidência salva ainda. Abra um documento processado e salve uma página ou parte como evidência.</p>}
  </section>;
}
