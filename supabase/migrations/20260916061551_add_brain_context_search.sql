create index memory_nodes_brain_fts_idx
on public.memory_nodes using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(reflection, '')));

create index library_evidence_brain_fts_idx
on public.library_evidence using gin (to_tsvector('simple', coalesce(source_label, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(note, '')));

create or replace function public.search_brain_context(p_query text, p_limit integer default 20)
returns table (
  context_type text,
  context_id uuid,
  title text,
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
      'memory'::text as context_type,
      m.id as context_id,
      m.title,
      left(coalesce(m.reflection, ''), 3000) as excerpt,
      ts_rank_cd(to_tsvector('simple', coalesce(m.title, '') || ' ' || coalesce(m.reflection, '')), q.query)::real as rank
    from public.memory_nodes m
    cross join q
    where m.user_id = auth.uid()
      and m.status <> 'archived'
      and q.query <> ''::tsquery
      and to_tsvector('simple', coalesce(m.title, '') || ' ' || coalesce(m.reflection, '')) @@ q.query

    union all

    select
      'evidence'::text as context_type,
      e.id as context_id,
      e.source_label as title,
      left(e.excerpt, 3000) as excerpt,
      ts_rank_cd(to_tsvector('simple', coalesce(e.source_label, '') || ' ' || coalesce(e.excerpt, '') || ' ' || coalesce(e.note, '')), q.query)::real as rank
    from public.library_evidence e
    cross join q
    where e.user_id = auth.uid()
      and q.query <> ''::tsquery
      and to_tsvector('simple', coalesce(e.source_label, '') || ' ' || coalesce(e.excerpt, '') || ' ' || coalesce(e.note, '')) @@ q.query
  )
  select * from matches
  order by rank desc, context_type asc, title asc
  limit greatest(1, least(coalesce(p_limit, 20), 60));
$$;

revoke all on function public.search_brain_context(text, integer) from public, anon;
grant execute on function public.search_brain_context(text, integer) to authenticated;
