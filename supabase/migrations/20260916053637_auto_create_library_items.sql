create or replace function public.create_library_item_for_document()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.library_items(
    user_id, title, kind, authorship, document_id,
    retrieval_enabled, authorial_memory_status, created_at, updated_at
  )
  values (
    new.user_id, new.file_name, 'document', 'unknown', new.id,
    true, 'unreviewed', new.created_at, new.updated_at
  )
  on conflict (document_id) where document_id is not null do nothing;
  return new;
end;
$$;

revoke all on function public.create_library_item_for_document() from public, anon, authenticated;

drop trigger if exists library_documents_create_catalog_item on public.library_documents;
create trigger library_documents_create_catalog_item
after insert on public.library_documents
for each row execute function public.create_library_item_for_document();

create or replace function public.create_library_item_for_source()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.library_items(
    user_id, title, kind, authorship, source_id,
    retrieval_enabled, authorial_memory_status, created_at, updated_at
  )
  values (
    new.user_id, new.title, 'text', 'unknown', new.id,
    true, 'unreviewed', new.created_at, new.updated_at
  )
  on conflict (source_id) where source_id is not null do nothing;
  return new;
end;
$$;

revoke all on function public.create_library_item_for_source() from public, anon, authenticated;

drop trigger if exists sources_create_catalog_item on public.sources;
create trigger sources_create_catalog_item
after insert on public.sources
for each row execute function public.create_library_item_for_source();
