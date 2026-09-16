create table if not exists public.library_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null,
  source_kind text not null check (source_kind in ('page','chunk')),
  page_number integer,
  chunk_index integer,
  source_label text not null,
  excerpt text not null check (char_length(excerpt) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (document_id, user_id) references public.library_documents(id, user_id) on delete cascade,
  check (
    (source_kind = 'page' and page_number is not null and page_number > 0 and chunk_index is null)
    or
    (source_kind = 'chunk' and chunk_index is not null and chunk_index >= 0 and page_number is null)
  )
);

create index if not exists library_evidence_user_created_idx
  on public.library_evidence(user_id, created_at desc);
create index if not exists library_evidence_document_idx
  on public.library_evidence(document_id, created_at desc);

alter table public.library_evidence enable row level security;

create policy library_evidence_select_own on public.library_evidence
for select to authenticated using (auth.uid() = user_id);
create policy library_evidence_insert_own on public.library_evidence
for insert to authenticated with check (auth.uid() = user_id);
create policy library_evidence_update_own on public.library_evidence
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy library_evidence_delete_own on public.library_evidence
for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists library_evidence_set_updated_at on public.library_evidence;
create trigger library_evidence_set_updated_at
before update on public.library_evidence
for each row execute function public.set_library_document_updated_at();
