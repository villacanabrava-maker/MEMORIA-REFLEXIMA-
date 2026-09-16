create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'draft',
  approved_version_id uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reflections_id_user_unique unique (id, user_id),
  constraint reflections_title_valid check (char_length(title) between 1 and 200 and title ~ '[^[:space:]]'),
  constraint reflections_status_valid check (status in ('draft','review','approved','archived')),
  constraint reflections_approval_state_valid check ((status = 'approved' and approved_version_id is not null and approved_at is not null) or (status <> 'approved' and approved_at is null))
);

create index reflections_user_updated_idx on public.reflections(user_id, updated_at desc);
create index reflections_user_status_idx on public.reflections(user_id, status, updated_at desc);

create trigger reflections_set_updated_at
before update on public.reflections
for each row execute function public.set_library_document_updated_at();

alter table public.reflections enable row level security;
revoke all on table public.reflections from public, anon, authenticated;
grant select, delete on table public.reflections to authenticated;
grant insert (title, status) on table public.reflections to authenticated;
grant update (title) on table public.reflections to authenticated;

create policy reflections_select_own on public.reflections
for select to authenticated using ((select auth.uid()) = user_id);
create policy reflections_insert_own on public.reflections
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy reflections_update_own on public.reflections
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reflections_delete_own on public.reflections
for delete to authenticated using ((select auth.uid()) = user_id);

create table public.reflection_versions (
  id uuid primary key default gen_random_uuid(),
  reflection_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stage text not null,
  content text not null,
  author_kind text not null default 'user',
  generation_run_id uuid,
  created_at timestamptz not null default now(),
  constraint reflection_versions_id_user_unique unique (id, user_id),
  constraint reflection_versions_stage_valid check (stage in ('external','commentary','conflicts','plan','ai_draft','revision','approved')),
  constraint reflection_versions_content_valid check (char_length(content) between 1 and 50000 and content ~ '[^[:space:]]'),
  constraint reflection_versions_author_valid check (author_kind in ('user','ai')),
  constraint reflection_versions_generation_valid check ((author_kind = 'user' and generation_run_id is null) or (author_kind = 'ai' and generation_run_id is not null)),
  constraint reflection_versions_reflection_owner_fkey foreign key (reflection_id, user_id) references public.reflections(id, user_id) on delete cascade,
  constraint reflection_versions_generation_owner_fkey foreign key (generation_run_id, user_id) references public.brain_generation_runs(id, user_id) on delete restrict
);

alter table public.reflections
  add constraint reflections_approved_version_owner_fkey
  foreign key (approved_version_id, user_id) references public.reflection_versions(id, user_id) on delete restrict;

create index reflection_versions_user_reflection_idx on public.reflection_versions(user_id, reflection_id, created_at desc);
create index reflection_versions_user_stage_idx on public.reflection_versions(user_id, stage, created_at desc);

alter table public.reflection_versions enable row level security;
revoke all on table public.reflection_versions from public, anon, authenticated;
grant select on table public.reflection_versions to authenticated;
grant insert (reflection_id, stage, content) on table public.reflection_versions to authenticated;

create policy reflection_versions_select_own on public.reflection_versions
for select to authenticated using ((select auth.uid()) = user_id);
create policy reflection_versions_insert_own on public.reflection_versions
for insert to authenticated with check ((select auth.uid()) = user_id and author_kind = 'user' and generation_run_id is null and stage <> 'ai_draft');

create table public.reflection_memories (
  reflection_id uuid not null,
  memory_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null default 'context',
  note text,
  created_at timestamptz not null default now(),
  primary key (reflection_id, memory_id),
  constraint reflection_memories_role_valid check (role in ('supports','context','contrasts','example')),
  constraint reflection_memories_note_valid check (note is null or char_length(note) <= 2000),
  constraint reflection_memories_reflection_owner_fkey foreign key (reflection_id, user_id) references public.reflections(id, user_id) on delete cascade,
  constraint reflection_memories_memory_owner_fkey foreign key (memory_id, user_id) references public.memory_nodes(id, user_id) on delete cascade
);

create index reflection_memories_user_reflection_idx on public.reflection_memories(user_id, reflection_id);
create index reflection_memories_user_memory_idx on public.reflection_memories(user_id, memory_id);

alter table public.reflection_memories enable row level security;
revoke all on table public.reflection_memories from public, anon, authenticated;
grant select, delete on table public.reflection_memories to authenticated;
grant insert (reflection_id, memory_id, role, note) on table public.reflection_memories to authenticated;
grant update (role, note) on table public.reflection_memories to authenticated;

create policy reflection_memories_select_own on public.reflection_memories for select to authenticated using ((select auth.uid()) = user_id);
create policy reflection_memories_insert_own on public.reflection_memories for insert to authenticated with check ((select auth.uid()) = user_id);
create policy reflection_memories_update_own on public.reflection_memories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reflection_memories_delete_own on public.reflection_memories for delete to authenticated using ((select auth.uid()) = user_id);

create table public.reflection_evidence (
  reflection_id uuid not null,
  evidence_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null default 'supports',
  note text,
  created_at timestamptz not null default now(),
  primary key (reflection_id, evidence_id),
  constraint reflection_evidence_role_valid check (role in ('supports','context','contrasts','example')),
  constraint reflection_evidence_note_valid check (note is null or char_length(note) <= 2000),
  constraint reflection_evidence_reflection_owner_fkey foreign key (reflection_id, user_id) references public.reflections(id, user_id) on delete cascade,
  constraint reflection_evidence_evidence_owner_fkey foreign key (evidence_id, user_id) references public.library_evidence(id, user_id) on delete cascade
);

create index reflection_evidence_user_reflection_idx on public.reflection_evidence(user_id, reflection_id);
create index reflection_evidence_user_evidence_idx on public.reflection_evidence(user_id, evidence_id);

alter table public.reflection_evidence enable row level security;
revoke all on table public.reflection_evidence from public, anon, authenticated;
grant select, delete on table public.reflection_evidence to authenticated;
grant insert (reflection_id, evidence_id, role, note) on table public.reflection_evidence to authenticated;
grant update (role, note) on table public.reflection_evidence to authenticated;

create policy reflection_evidence_select_own on public.reflection_evidence for select to authenticated using ((select auth.uid()) = user_id);
create policy reflection_evidence_insert_own on public.reflection_evidence for insert to authenticated with check ((select auth.uid()) = user_id);
create policy reflection_evidence_update_own on public.reflection_evidence for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reflection_evidence_delete_own on public.reflection_evidence for delete to authenticated using ((select auth.uid()) = user_id);

create table public.reflection_insights (
  reflection_id uuid not null,
  insight_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null default 'context',
  note text,
  created_at timestamptz not null default now(),
  primary key (reflection_id, insight_id),
  constraint reflection_insights_role_valid check (role in ('supports','context','contrasts','example')),
  constraint reflection_insights_note_valid check (note is null or char_length(note) <= 2000),
  constraint reflection_insights_reflection_owner_fkey foreign key (reflection_id, user_id) references public.reflections(id, user_id) on delete cascade,
  constraint reflection_insights_insight_owner_fkey foreign key (insight_id, user_id) references public.brain_insights(id, user_id) on delete cascade
);

create index reflection_insights_user_reflection_idx on public.reflection_insights(user_id, reflection_id);
create index reflection_insights_user_insight_idx on public.reflection_insights(user_id, insight_id);

alter table public.reflection_insights enable row level security;
revoke all on table public.reflection_insights from public, anon, authenticated;
grant select, delete on table public.reflection_insights to authenticated;
grant insert (reflection_id, insight_id, role, note) on table public.reflection_insights to authenticated;
grant update (role, note) on table public.reflection_insights to authenticated;

create policy reflection_insights_select_own on public.reflection_insights for select to authenticated using ((select auth.uid()) = user_id);
create policy reflection_insights_insert_own on public.reflection_insights for insert to authenticated with check ((select auth.uid()) = user_id);
create policy reflection_insights_update_own on public.reflection_insights for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reflection_insights_delete_own on public.reflection_insights for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.submit_reflection_for_review(p_reflection_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.reflections
  set status = 'review', approved_version_id = null, approved_at = null
  where id = p_reflection_id and user_id = auth.uid() and status in ('draft','review');
  if not found then raise exception 'reflection_not_editable'; end if;
end;
$$;

grant execute on function public.submit_reflection_for_review(uuid) to authenticated;

create or replace function public.return_reflection_to_draft(p_reflection_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.reflections
  set status = 'draft', approved_version_id = null, approved_at = null
  where id = p_reflection_id and user_id = auth.uid() and status = 'review';
  if not found then raise exception 'reflection_not_in_review'; end if;
end;
$$;

grant execute on function public.return_reflection_to_draft(uuid) to authenticated;

create or replace function public.approve_reflection(p_reflection_id uuid, p_version_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_stage text;
begin
  select stage into v_stage
  from public.reflection_versions
  where id = p_version_id and reflection_id = p_reflection_id and user_id = auth.uid();
  if v_stage is null or v_stage not in ('revision','approved') then raise exception 'invalid_approval_version'; end if;

  update public.reflections
  set status = 'approved', approved_version_id = p_version_id, approved_at = now()
  where id = p_reflection_id and user_id = auth.uid() and status = 'review';
  if not found then raise exception 'reflection_not_in_review'; end if;
end;
$$;

grant execute on function public.approve_reflection(uuid, uuid) to authenticated;

create or replace function public.archive_reflection(p_reflection_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.reflections
  set status = 'archived', approved_at = null
  where id = p_reflection_id and user_id = auth.uid() and status <> 'archived';
  if not found then raise exception 'reflection_not_archivable'; end if;
end;
$$;

grant execute on function public.archive_reflection(uuid) to authenticated;
