import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { formatDate } from "@/lib/sources/data";

export const metadata = { title: "Evidências | Memória Reflexiva" };

type EvidenceRow = {
  id: string;
  source_label: string;
  excerpt: string;
  start_offset: number | null;
  end_offset: number | null;
  note: string | null;
  source_updated_at: string | null;
  created_at: string;
  document_id: string;
};

type DocumentRow = { id: string; storage_key: string; file_name: string };

export default async function EvidencePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const { data: evidence } = await supabase.from("library_evidence")
    .select("id,source_label,excerpt,start_offset,end_offset,note,source_updated_at,created_at,document_id")
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
      <div className="workspace-actions"><Link className="workspace-button neutral" href="/memoria">Minha Memória</Link><Link className="workspace-button neutral" href="/biblioteca">← Biblioteca</Link></div>
    </div>
    <p className="files-explanation">Cada evidência é derivada novamente da página ou parte armazenada no banco. Trechos selecionados mantêm seus offsets dentro da fonte e não podem ter o texto adulterado pelo cliente.</p>
    {params.status === "invalida" ? <p className="field-error" role="status">A origem desta evidência não pôde ser validada.</p> : null}
    {rows.length ? <ul className="source-grid">{rows.map((row) => {
      const document = byId.get(row.document_id);
      const precise = row.start_offset !== null && row.end_offset !== null;
      return <li className="source-card" key={row.id}>
        <div className="library-toolbar">
          <p className="eyebrow">{precise ? "Trecho preciso" : "Fonte inteira"}</p>
          {precise ? <span className="file-kind">{row.start_offset}–{row.end_offset}</span> : null}
        </div>
        <h3>{row.source_label}</h3>
        <p>{row.excerpt.length > 800 ? `${row.excerpt.slice(0, 800)}…` : row.excerpt}</p>
        {row.note ? <p><strong>Minha observação:</strong> {row.note}</p> : null}
        <div className="source-meta">
          <span>Salva em <time dateTime={row.created_at}>{formatDate(row.created_at)}</time></span>
          {row.source_updated_at ? <span>Fonte processada em <time dateTime={row.source_updated_at}>{formatDate(row.source_updated_at)}</time></span> : null}
        </div>
        <div className="workspace-actions">
          <Link className="workspace-button primary" href={`/memoria/novo?evidencia=${row.id}`}>Criar memória desta evidência</Link>
          {document ? <Link className="workspace-button neutral" href={`/biblioteca/arquivos/${encodeURIComponent(document.storage_key)}`}>Abrir origem</Link> : null}
        </div>
      </li>;
    })}</ul> : <p>Nenhuma evidência salva ainda. Abra um documento processado, selecione uma passagem e salve o trecho como evidência.</p>}
  </section>;
}
