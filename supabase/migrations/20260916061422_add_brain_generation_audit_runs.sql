create table public.brain_generation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text not null,
  model_version text,
  prompt_version text not null,
  retrieval_method text not null default 'fts',
  goal text,
  status text not null default 'queued',
  input_tokens bigint,
  output_tokens bigint,
  last_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint brain_generation_runs_id_user_unique unique (id, user_id),
  constraint brain_generation_runs_provider_valid check (char_length(provider) between 1 and 80),
  constraint brain_generation_runs_model_valid check (char_length(model) between 1 and 160),
  constraint brain_generation_runs_model_version_valid check (model_version is null or char_length(model_version) <= 160),
  constraint brain_generation_runs_prompt_version_valid check (char_length(prompt_version) between 1 and 120),
  constraint brain_generation_runs_retrieval_valid check (retrieval_method in ('manual','fts','semantic','hybrid')),
  constraint brain_generation_runs_goal_valid check (goal is null or char_length(goal) <= 4000),
  constraint brain_generation_runs_status_valid check (status in ('queued','running','completed','failed','cancelled')),
  constraint brain_generation_runs_tokens_valid check ((input_tokens is null or input_tokens >= 0) and (output_tokens is null or output_tokens >= 0)),
  constraint brain_generation_runs_error_valid check (last_error is null or char_length(last_error) <= 4000)
);

create index brain_generation_runs_user_created_idx on public.brain_generation_runs(user_id, created_at desc);
create index brain_generation_runs_user_status_idx on public.brain_generation_runs(user_id, status, created_at desc);

alter table public.brain_generation_runs enable row level security;
revoke all on table public.brain_generation_runs from public, anon, authenticated;
grant select on table public.brain_generation_runs to authenticated;
create policy brain_generation_runs_select_own on public.brain_generation_runs
for select to authenticated using ((select auth.uid()) = user_id);

create table public.brain_generation_memories (
  run_id uuid not null,
  memory_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  rank integer,
  selection_reason text,
  created_at timestamptz not null default now(),
  primary key (run_id, memory_id),
  constraint brain_generation_memories_rank_valid check (rank is null or rank > 0),
  constraint brain_generation_memories_reason_valid check (selection_reason is null or char_length(selection_reason) <= 2000),
  constraint brain_generation_memories_run_owner_fkey foreign key (run_id, user_id) references public.brain_generation_runs(id, user_id) on delete cascade,
  constraint brain_generation_memories_memory_owner_fkey foreign key (memory_id, user_id) references public.memory_nodes(id, user_id) on delete cascade
);

create index brain_generation_memories_user_run_idx on public.brain_generation_memories(user_id, run_id);
create index brain_generation_memories_user_memory_idx on public.brain_generation_memories(user_id, memory_id);
alter table public.brain_generation_memories enable row level security;
revoke all on table public.brain_generation_memories from public, anon, authenticated;
grant select on table public.brain_generation_memories to authenticated;
create policy brain_generation_memories_select_own on public.brain_generation_memories
for select to authenticated using ((select auth.uid()) = user_id);

create table public.brain_generation_evidence (
  run_id uuid not null,
  evidence_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  rank integer,
  selection_reason text,
  created_at timestamptz not null default now(),
  primary key (run_id, evidence_id),
  constraint brain_generation_evidence_rank_valid check (rank is null or rank > 0),
  constraint brain_generation_evidence_reason_valid check (selection_reason is null or char_length(selection_reason) <= 2000),
  constraint brain_generation_evidence_run_owner_fkey foreign key (run_id, user_id) references public.brain_generation_runs(id, user_id) on delete cascade,
  constraint brain_generation_evidence_evidence_owner_fkey foreign key (evidence_id, user_id) references public.library_evidence(id, user_id) on delete cascade
);

create index brain_generation_evidence_user_run_idx on public.brain_generation_evidence(user_id, run_id);
create index brain_generation_evidence_user_evidence_idx on public.brain_generation_evidence(user_id, evidence_id);
alter table public.brain_generation_evidence enable row level security;
revoke all on table public.brain_generation_evidence from public, anon, authenticated;
grant select on table public.brain_generation_evidence to authenticated;
create policy brain_generation_evidence_select_own on public.brain_generation_evidence
for select to authenticated using ((select auth.uid()) = user_id);

alter table public.brain_insights
  add column generation_run_id uuid,
  add constraint brain_insights_generation_run_owner_fkey foreign key (generation_run_id, user_id) references public.brain_generation_runs(id, user_id) on delete set null,
  add constraint brain_insights_generation_run_consistency check ((origin = 'manual' and generation_run_id is null) or (origin = 'ai' and generation_run_id is not null));

create index brain_insights_user_generation_run_idx on public.brain_insights(user_id, generation_run_id) where generation_run_id is not null;
