create table if not exists public.library_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  label text,
  content text not null default '',
  character_count integer not null default 0 check (character_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, chunk_index),
  foreign key (document_id, user_id) references public.library_documents(id, user_id) on delete cascade
);

create index if not exists library_document_chunks_document_idx
  on public.library_document_chunks(document_id, chunk_index);

alter table public.library_document_chunks enable row level security;

create policy library_document_chunks_select_own on public.library_document_chunks
for select to authenticated using (auth.uid() = user_id);
create policy library_document_chunks_insert_own on public.library_document_chunks
for insert to authenticated with check (auth.uid() = user_id);
create policy library_document_chunks_update_own on public.library_document_chunks
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy library_document_chunks_delete_own on public.library_document_chunks
for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists library_document_chunks_set_updated_at on public.library_document_chunks;
create trigger library_document_chunks_set_updated_at
before update on public.library_document_chunks
for each row execute function public.set_library_document_updated_at();
