create table if not exists public.library_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_key text not null,
  file_name text not null,
  status text not null default 'pending' check (status in ('pending','processing','completed','needs_ocr','error')),
  total_pages integer,
  processed_pages integer not null default 0 check (processed_pages >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, storage_key),
  unique (id, user_id)
);

create table if not exists public.library_document_pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  content text not null default '',
  character_count integer not null default 0 check (character_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, page_number),
  foreign key (document_id, user_id) references public.library_documents(id, user_id) on delete cascade
);

create index if not exists library_documents_user_updated_idx on public.library_documents(user_id, updated_at desc);
create index if not exists library_document_pages_document_page_idx on public.library_document_pages(document_id, page_number);

alter table public.library_documents enable row level security;
alter table public.library_document_pages enable row level security;

create policy library_documents_select_own on public.library_documents for select to authenticated using (auth.uid() = user_id);
create policy library_documents_insert_own on public.library_documents for insert to authenticated with check (auth.uid() = user_id);
create policy library_documents_update_own on public.library_documents for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy library_documents_delete_own on public.library_documents for delete to authenticated using (auth.uid() = user_id);

create policy library_document_pages_select_own on public.library_document_pages for select to authenticated using (auth.uid() = user_id);
create policy library_document_pages_insert_own on public.library_document_pages for insert to authenticated with check (auth.uid() = user_id);
create policy library_document_pages_update_own on public.library_document_pages for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy library_document_pages_delete_own on public.library_document_pages for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_library_document_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists library_documents_set_updated_at on public.library_documents;
create trigger library_documents_set_updated_at before update on public.library_documents for each row execute function public.set_library_document_updated_at();

drop trigger if exists library_document_pages_set_updated_at on public.library_document_pages;
create trigger library_document_pages_set_updated_at before update on public.library_document_pages for each row execute function public.set_library_document_updated_at();
