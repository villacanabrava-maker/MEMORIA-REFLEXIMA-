alter table public.library_evidence
  add constraint library_evidence_id_user_unique unique (id, user_id);

create table public.memory_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  node_type text not null,
  title text not null,
  reflection text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memory_nodes_id_user_unique unique (id, user_id),
  constraint memory_nodes_type_valid check (node_type in ('concept','theme','experience','person','event','story','pattern','idea')),
  constraint memory_nodes_title_valid check (char_length(title) between 1 and 200 and title ~ '[^[:space:]]'),
  constraint memory_nodes_reflection_valid check (reflection is null or char_length(reflection) <= 10000),
  constraint memory_nodes_status_valid check (status in ('draft','confirmed','archived'))
);

create index memory_nodes_user_updated_idx on public.memory_nodes(user_id, updated_at desc);
create index memory_nodes_user_type_idx on public.memory_nodes(user_id, node_type, updated_at desc);
create index memory_nodes_user_status_idx on public.memory_nodes(user_id, status, updated_at desc);

create trigger memory_nodes_set_updated_at
before update on public.memory_nodes
for each row execute function public.set_library_document_updated_at();

alter table public.memory_nodes enable row level security;
revoke all on table public.memory_nodes from public, anon, authenticated;
grant select, delete on table public.memory_nodes to authenticated;
grant insert (node_type, title, reflection, status) on table public.memory_nodes to authenticated;
grant update (node_type, title, reflection, status) on table public.memory_nodes to authenticated;

create policy memory_nodes_select_own on public.memory_nodes
for select to authenticated using ((select auth.uid()) = user_id);
create policy memory_nodes_insert_own on public.memory_nodes
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy memory_nodes_update_own on public.memory_nodes
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy memory_nodes_delete_own on public.memory_nodes
for delete to authenticated using ((select auth.uid()) = user_id);

create table public.memory_evidence (
  memory_id uuid not null,
  evidence_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null default 'supports',
  note text,
  created_at timestamptz not null default now(),
  primary key (memory_id, evidence_id),
  constraint memory_evidence_role_valid check (role in ('supports','context','contrasts','example')),
  constraint memory_evidence_note_valid check (note is null or char_length(note) <= 2000),
  constraint memory_evidence_memory_owner_fkey foreign key (memory_id, user_id) references public.memory_nodes(id, user_id) on delete cascade,
  constraint memory_evidence_evidence_owner_fkey foreign key (evidence_id, user_id) references public.library_evidence(id, user_id) on delete cascade
);

create index memory_evidence_user_memory_idx on public.memory_evidence(user_id, memory_id);
create index memory_evidence_user_evidence_idx on public.memory_evidence(user_id, evidence_id);

alter table public.memory_evidence enable row level security;
revoke all on table public.memory_evidence from public, anon, authenticated;
grant select, delete on table public.memory_evidence to authenticated;
grant insert (memory_id, evidence_id, role, note) on table public.memory_evidence to authenticated;
grant update (role, note) on table public.memory_evidence to authenticated;

create policy memory_evidence_select_own on public.memory_evidence
for select to authenticated using ((select auth.uid()) = user_id);
create policy memory_evidence_insert_own on public.memory_evidence
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy memory_evidence_update_own on public.memory_evidence
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy memory_evidence_delete_own on public.memory_evidence
for delete to authenticated using ((select auth.uid()) = user_id);

create table public.memory_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_memory_id uuid not null,
  to_memory_id uuid not null,
  relation_type text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint memory_relations_distinct_nodes check (from_memory_id <> to_memory_id),
  constraint memory_relations_type_valid check (relation_type in ('related_to','contrasts_with','evolved_from','supports','part_of','example_of','influences')),
  constraint memory_relations_note_valid check (note is null or char_length(note) <= 2000),
  constraint memory_relations_from_owner_fkey foreign key (from_memory_id, user_id) references public.memory_nodes(id, user_id) on delete cascade,
  constraint memory_relations_to_owner_fkey foreign key (to_memory_id, user_id) references public.memory_nodes(id, user_id) on delete cascade,
  constraint memory_relations_unique unique (user_id, from_memory_id, to_memory_id, relation_type)
);

create index memory_relations_user_from_idx on public.memory_relations(user_id, from_memory_id);
create index memory_relations_user_to_idx on public.memory_relations(user_id, to_memory_id);

alter table public.memory_relations enable row level security;
revoke all on table public.memory_relations from public, anon, authenticated;
grant select, delete on table public.memory_relations to authenticated;
grant insert (from_memory_id, to_memory_id, relation_type, note) on table public.memory_relations to authenticated;
grant update (relation_type, note) on table public.memory_relations to authenticated;

create policy memory_relations_select_own on public.memory_relations
for select to authenticated using ((select auth.uid()) = user_id);
create policy memory_relations_insert_own on public.memory_relations
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy memory_relations_update_own on public.memory_relations
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy memory_relations_delete_own on public.memory_relations
for delete to authenticated using ((select auth.uid()) = user_id);
