alter table public.sources
  add constraint sources_id_user_unique unique (id, user_id);

create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  kind text not null default 'document',
  authorship text not null default 'unknown',
  author_name text,
  published_year integer,
  category text,
  theme text,
  description text,
  document_id uuid,
  source_id uuid,
  retrieval_enabled boolean not null default true,
  authorial_memory_status text not null default 'unreviewed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_items_title_valid check (char_length(title) between 1 and 300 and title ~ '[^[:space:]]'),
  constraint library_items_kind_valid check (kind in ('book','letter','reflection','report','note','message','work_material','document','text','other')),
  constraint library_items_authorship_valid check (authorship in ('unknown','user','external','mixed','ai')),
  constraint library_items_author_name_valid check (author_name is null or char_length(author_name) <= 200),
  constraint library_items_year_valid check (published_year is null or published_year between -5000 and 3000),
  constraint library_items_category_valid check (category is null or char_length(category) <= 120),
  constraint library_items_theme_valid check (theme is null or char_length(theme) <= 120),
  constraint library_items_description_valid check (description is null or char_length(description) <= 2000),
  constraint library_items_memory_status_valid check (authorial_memory_status in ('unreviewed','not_authorial','eligible','approved','incorporated','excluded')),
  constraint library_items_one_origin check (num_nonnulls(document_id, source_id) = 1),
  constraint library_items_document_owner_fkey foreign key (document_id, user_id) references public.library_documents(id, user_id) on delete cascade,
  constraint library_items_source_owner_fkey foreign key (source_id, user_id) references public.sources(id, user_id) on delete cascade
);

create unique index library_items_document_unique on public.library_items(document_id) where document_id is not null;
create unique index library_items_source_unique on public.library_items(source_id) where source_id is not null;
create index library_items_user_updated_idx on public.library_items(user_id, updated_at desc);
create index library_items_user_kind_idx on public.library_items(user_id, kind);
create index library_items_user_authorship_idx on public.library_items(user_id, authorship);

alter table public.library_items enable row level security;
revoke all on table public.library_items from anon, authenticated;
grant select, insert, update, delete on table public.library_items to authenticated;

create policy library_items_select_own on public.library_items
for select to authenticated using ((select auth.uid()) = user_id);
create policy library_items_insert_own on public.library_items
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy library_items_update_own on public.library_items
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy library_items_delete_own on public.library_items
for delete to authenticated using ((select auth.uid()) = user_id);

create trigger library_items_set_updated_at
before update on public.library_items
for each row execute function public.set_library_document_updated_at();

insert into public.library_items(user_id, title, kind, authorship, document_id, retrieval_enabled, authorial_memory_status, created_at, updated_at)
select d.user_id, d.file_name, 'document', 'unknown', d.id, true, 'unreviewed', d.created_at, d.updated_at
from public.library_documents d
on conflict (document_id) where document_id is not null do nothing;

insert into public.library_items(user_id, title, kind, authorship, source_id, retrieval_enabled, authorial_memory_status, created_at, updated_at)
select s.user_id, s.title, 'text', 'unknown', s.id, true, 'unreviewed', s.created_at, s.updated_at
from public.sources s
on conflict (source_id) where source_id is not null do nothing;
