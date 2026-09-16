alter table public.library_evidence
  add column if not exists start_offset integer,
  add column if not exists end_offset integer,
  add column if not exists context_before text,
  add column if not exists context_after text,
  add column if not exists note text,
  add column if not exists source_updated_at timestamptz;

alter table public.library_evidence
  add constraint library_evidence_offsets_valid check (
    (start_offset is null and end_offset is null)
    or
    (start_offset is not null and end_offset is not null and start_offset >= 0 and end_offset > start_offset and end_offset - start_offset <= 20000)
  ),
  add constraint library_evidence_context_before_valid check (context_before is null or char_length(context_before) <= 400),
  add constraint library_evidence_context_after_valid check (context_after is null or char_length(context_after) <= 400),
  add constraint library_evidence_note_valid check (note is null or char_length(note) <= 2000);

create or replace function public.save_library_evidence(
  p_document_id uuid,
  p_source_kind text,
  p_index integer,
  p_start_offset integer default null,
  p_end_offset integer default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_file_name text;
  v_content text;
  v_source_label text;
  v_source_updated_at timestamptz;
  v_chunk_label text;
  v_excerpt text;
  v_context_before text;
  v_context_after text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_id uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_source_kind not in ('page', 'chunk') then raise exception 'invalid source kind'; end if;
  if p_index is null or p_index < 0 then raise exception 'invalid source index'; end if;
  if v_note is not null and char_length(v_note) > 2000 then raise exception 'note too large'; end if;
  if (p_start_offset is null) <> (p_end_offset is null) then raise exception 'both offsets are required'; end if;

  select file_name into v_file_name
  from public.library_documents
  where id = p_document_id and user_id = v_user;
  if not found then raise exception 'document not found'; end if;

  if p_source_kind = 'page' then
    if p_index < 1 then raise exception 'invalid page'; end if;
    select content, updated_at into v_content, v_source_updated_at
    from public.library_document_pages
    where document_id = p_document_id and user_id = v_user and page_number = p_index;
    if not found then raise exception 'page not found'; end if;
    v_source_label := v_file_name || ' · Página ' || p_index;
  else
    select content, updated_at, label into v_content, v_source_updated_at, v_chunk_label
    from public.library_document_chunks
    where document_id = p_document_id and user_id = v_user and chunk_index = p_index;
    if not found then raise exception 'chunk not found'; end if;
    v_source_label := v_file_name || ' · ' || coalesce(v_chunk_label, 'Parte ' || (p_index + 1));
  end if;

  if v_content is null or char_length(v_content) = 0 then raise exception 'empty source'; end if;

  if p_start_offset is null then
    if char_length(v_content) > 20000 then raise exception 'source too large for whole evidence'; end if;
    v_excerpt := v_content;
  else
    if p_start_offset < 0 or p_end_offset <= p_start_offset or p_end_offset > char_length(v_content) then
      raise exception 'invalid offsets';
    end if;
    if p_end_offset - p_start_offset > 20000 then raise exception 'evidence span too large'; end if;
    v_excerpt := substring(v_content from p_start_offset + 1 for p_end_offset - p_start_offset);
    v_context_before := case when p_start_offset > 0 then substring(v_content from greatest(1, p_start_offset - 399) for least(400, p_start_offset)) end;
    v_context_after := case when p_end_offset < char_length(v_content) then substring(v_content from p_end_offset + 1 for 400) end;
  end if;

  insert into public.library_evidence(
    user_id, document_id, source_kind, page_number, chunk_index, source_label, excerpt,
    start_offset, end_offset, context_before, context_after, note, source_updated_at
  )
  values (
    v_user,
    p_document_id,
    p_source_kind,
    case when p_source_kind = 'page' then p_index else null end,
    case when p_source_kind = 'chunk' then p_index else null end,
    v_source_label,
    v_excerpt,
    p_start_offset,
    p_end_offset,
    v_context_before,
    v_context_after,
    v_note,
    v_source_updated_at
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.save_library_evidence(uuid, text, integer, integer, integer, text) from public, anon;
grant execute on function public.save_library_evidence(uuid, text, integer, integer, integer, text) to authenticated;

revoke insert, update on table public.library_evidence from authenticated;
grant update (note) on table public.library_evidence to authenticated;
drop policy if exists library_evidence_insert_own on public.library_evidence;
