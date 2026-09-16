create index if not exists library_document_pages_fts_idx
on public.library_document_pages using gin (to_tsvector('simple', content));

create index if not exists library_document_chunks_fts_idx
on public.library_document_chunks using gin (to_tsvector('simple', content));

create or replace function public.search_library_content(p_query text, p_limit integer default 30)
returns table (
  document_id uuid,
  storage_key text,
  file_name text,
  source_kind text,
  location_label text,
  page_number integer,
  chunk_index integer,
  excerpt text,
  rank real
)
language sql
stable
set search_path = public
as $$
  with q as (
    select websearch_to_tsquery('simple', left(coalesce(p_query, ''), 200)) as query
  ), matches as (
    select
      d.id as document_id,
      d.storage_key,
      d.file_name,
      'page'::text as source_kind,
      ('Página ' || p.page_number)::text as location_label,
      p.page_number,
      null::integer as chunk_index,
      ts_headline('simple', p.content, q.query, 'StartSel=,StopSel=,MaxFragments=2,MinWords=8,MaxWords=30') as excerpt,
      ts_rank_cd(to_tsvector('simple', p.content), q.query)::real as rank
    from public.library_document_pages p
    join public.library_documents d on d.id = p.document_id and d.user_id = p.user_id
    cross join q
    where p.user_id = auth.uid()
      and q.query <> ''::tsquery
      and to_tsvector('simple', p.content) @@ q.query

    union all

    select
      d.id as document_id,
      d.storage_key,
      d.file_name,
      'chunk'::text as source_kind,
      coalesce(c.label, 'Parte ' || (c.chunk_index + 1))::text as location_label,
      null::integer as page_number,
      c.chunk_index,
      ts_headline('simple', c.content, q.query, 'StartSel=,StopSel=,MaxFragments=2,MinWords=8,MaxWords=30') as excerpt,
      ts_rank_cd(to_tsvector('simple', c.content), q.query)::real as rank
    from public.library_document_chunks c
    join public.library_documents d on d.id = c.document_id and d.user_id = c.user_id
    cross join q
    where c.user_id = auth.uid()
      and q.query <> ''::tsquery
      and to_tsvector('simple', c.content) @@ q.query
  )
  select * from matches
  order by rank desc, file_name asc, coalesce(page_number, chunk_index) asc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

grant execute on function public.search_library_content(text, integer) to authenticated;
