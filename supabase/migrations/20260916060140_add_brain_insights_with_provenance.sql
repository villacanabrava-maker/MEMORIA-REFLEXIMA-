create table public.brain_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  insight_type text not null,
  title text not null,
  statement text not null,
  status text not null default 'draft',
  origin text not null default 'manual',
  generation_model text,
  generation_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brain_insights_id_user_unique unique (id, user_id),
  constraint brain_insights_type_valid check (insight_type in ('writing_style','theme','concept','thinking_pattern','story_pattern','evolution','tension','other')),
  constraint brain_insights_title_valid check (char_length(title) between 1 and 200 and title ~ '[^[:space:]]'),
  constraint brain_insights_statement_valid check (char_length(statement) between 1 and 12000 and statement ~ '[^[:space:]]'),
  constraint brain_insights_status_valid check (status in ('draft','confirmed','rejected','archived')),
  constraint brain_insights_origin_valid check (origin in ('manual','ai')),
  constraint brain_insights_generation_valid check ((origin = 'manual' and generation_model is null and generation_version is null) or origin = 'ai')
);

create index brain_insights_user_updated_idx on public.brain_insights(user_id, updated_at desc);
create index brain_insights_user_type_idx on public.brain_insights(user_id, insight_type, updated_at desc);
create index brain_insights_user_status_idx on public.brain_insights(user_id, status, updated_at desc);

create trigger brain_insights_set_updated_at
before update on public.brain_insights
for each row execute function public.set_library_document_updated_at();

alter table public.brain_insights enable row level security;
revoke all on table public.brain_insights from public, anon, authenticated;
grant select, delete on table public.brain_insights to authenticated;
grant insert (insight_type, title, statement, status) on table public.brain_insights to authenticated;
grant update (insight_type, title, statement, status) on table public.brain_insights to authenticated;

create policy brain_insights_select_own on public.brain_insights
for select to authenticated using ((select auth.uid()) = user_id);
create policy brain_insights_insert_own on public.brain_insights
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy brain_insights_update_own on public.brain_insights
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy brain_insights_delete_own on public.brain_insights
for delete to authenticated using ((select auth.uid()) = user_id);

create table public.brain_insight_memories (
  insight_id uuid not null,
  memory_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null default 'supports',
  note text,
  created_at timestamptz not null default now(),
  primary key (insight_id, memory_id),
  constraint brain_insight_memories_role_valid check (role in ('supports','context','contrasts','example')),
  constraint brain_insight_memories_note_valid check (note is null or char_length(note) <= 2000),
  constraint brain_insight_memories_insight_owner_fkey foreign key (insight_id, user_id) references public.brain_insights(id, user_id) on delete cascade,
  constraint brain_insight_memories_memory_owner_fkey foreign key (memory_id, user_id) references public.memory_nodes(id, user_id) on delete cascade
);

create index brain_insight_memories_user_insight_idx on public.brain_insight_memories(user_id, insight_id);
create index brain_insight_memories_user_memory_idx on public.brain_insight_memories(user_id, memory_id);

alter table public.brain_insight_memories enable row level security;
revoke all on table public.brain_insight_memories from public, anon, authenticated;
grant select, delete on table public.brain_insight_memories to authenticated;
grant insert (insight_id, memory_id, role, note) on table public.brain_insight_memories to authenticated;
grant update (role, note) on table public.brain_insight_memories to authenticated;

create policy brain_insight_memories_select_own on public.brain_insight_memories
for select to authenticated using ((select auth.uid()) = user_id);
create policy brain_insight_memories_insert_own on public.brain_insight_memories
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy brain_insight_memories_update_own on public.brain_insight_memories
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy brain_insight_memories_delete_own on public.brain_insight_memories
for delete to authenticated using ((select auth.uid()) = user_id);

create table public.brain_insight_evidence (
  insight_id uuid not null,
  evidence_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null default 'supports',
  note text,
  created_at timestamptz not null default now(),
  primary key (insight_id, evidence_id),
  constraint brain_insight_evidence_role_valid check (role in ('supports','context','contrasts','example')),
  constraint brain_insight_evidence_note_valid check (note is null or char_length(note) <= 2000),
  constraint brain_insight_evidence_insight_owner_fkey foreign key (insight_id, user_id) references public.brain_insights(id, user_id) on delete cascade,
  constraint brain_insight_evidence_evidence_owner_fkey foreign key (evidence_id, user_id) references public.library_evidence(id, user_id) on delete cascade
);

create index brain_insight_evidence_user_insight_idx on public.brain_insight_evidence(user_id, insight_id);
create index brain_insight_evidence_user_evidence_idx on public.brain_insight_evidence(user_id, evidence_id);

alter table public.brain_insight_evidence enable row level security;
revoke all on table public.brain_insight_evidence from public, anon, authenticated;
grant select, delete on table public.brain_insight_evidence to authenticated;
grant insert (insight_id, evidence_id, role, note) on table public.brain_insight_evidence to authenticated;
grant update (role, note) on table public.brain_insight_evidence to authenticated;

create policy brain_insight_evidence_select_own on public.brain_insight_evidence
for select to authenticated using ((select auth.uid()) = user_id);
create policy brain_insight_evidence_insert_own on public.brain_insight_evidence
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy brain_insight_evidence_update_own on public.brain_insight_evidence
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy brain_insight_evidence_delete_own on public.brain_insight_evidence
for delete to authenticated using ((select auth.uid()) = user_id);

create table public.brain_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  insight_id uuid not null,
  rating text not null,
  comment text,
  correction text,
  created_at timestamptz not null default now(),
  constraint brain_feedback_rating_valid check (rating in ('correct','partial','incorrect')),
  constraint brain_feedback_comment_valid check (comment is null or char_length(comment) <= 4000),
  constraint brain_feedback_correction_valid check (correction is null or char_length(correction) <= 12000),
  constraint brain_feedback_insight_owner_fkey foreign key (insight_id, user_id) references public.brain_insights(id, user_id) on delete cascade
);

create index brain_feedback_user_insight_idx on public.brain_feedback(user_id, insight_id, created_at desc);

alter table public.brain_feedback enable row level security;
revoke all on table public.brain_feedback from public, anon, authenticated;
grant select on table public.brain_feedback to authenticated;
grant insert (insight_id, rating, comment, correction) on table public.brain_feedback to authenticated;

create policy brain_feedback_select_own on public.brain_feedback
for select to authenticated using ((select auth.uid()) = user_id);
create policy brain_feedback_insert_own on public.brain_feedback
for insert to authenticated with check ((select auth.uid()) = user_id);
