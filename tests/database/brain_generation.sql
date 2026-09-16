-- Disposable database only. Tests trusted AI generation audit records and ownership.
begin;

insert into auth.users (id) values
  ('60000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000000002');

insert into public.library_documents (id, user_id, storage_key, file_name)
values
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'a/gen.pdf', 'Gen A.pdf'),
  ('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 'b/gen.pdf', 'Gen B.pdf');

insert into public.library_evidence (id, user_id, document_id, source_kind, page_number, source_label, excerpt)
values
  ('62000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'page', 1, 'Gen A pagina 1', 'Evidencia A'),
  ('62000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000002', 'page', 1, 'Gen B pagina 1', 'Evidencia B');

insert into public.memory_nodes (id, user_id, node_type, title, reflection, status)
values
  ('63000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'concept', 'Memoria A', 'A', 'confirmed'),
  ('63000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 'concept', 'Memoria B', 'B', 'confirmed');

-- Simulate a trusted server/service process. Authenticated clients receive no write grants here.
insert into public.brain_generation_runs (
  id, user_id, provider, model, model_version, prompt_version, retrieval_method, goal, status, input_tokens, output_tokens, started_at, completed_at
) values
  ('64000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'test-provider', 'test-model', 'v1', 'brain-insight-v1', 'fts', 'Encontrar padroes', 'completed', 100, 20, now(), now()),
  ('64000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 'test-provider', 'test-model', 'v1', 'brain-insight-v1', 'fts', 'Encontrar temas', 'completed', 80, 15, now(), now());

insert into public.brain_generation_memories (run_id, memory_id, user_id, rank, selection_reason)
values ('64000000-0000-4000-8000-000000000001', '63000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 1, 'Top FTS');

insert into public.brain_generation_evidence (run_id, evidence_id, user_id, rank, selection_reason)
values ('64000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 1, 'Trecho relevante');

insert into public.brain_insights (
  user_id, insight_type, title, statement, status, origin, generation_model, generation_version, generation_run_id
) values (
  '60000000-0000-4000-8000-000000000001', 'thinking_pattern', 'Insight AI A', 'Sugestao auditada', 'draft', 'ai', 'test-model', 'v1', '64000000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);

do $$
begin
  if (select count(*) from public.brain_generation_runs) <> 1 then
    raise exception 'A must see only its generation run';
  end if;
  if (select count(*) from public.brain_generation_memories) <> 1 then
    raise exception 'A generation memory context missing';
  end if;
  if (select count(*) from public.brain_generation_evidence) <> 1 then
    raise exception 'A generation evidence context missing';
  end if;
  if not exists (
    select 1 from public.brain_insights
    where title = 'Insight AI A' and origin = 'ai' and generation_run_id = '64000000-0000-4000-8000-000000000001'
  ) then raise exception 'AI insight is not tied to its audited run'; end if;

  begin
    insert into public.brain_generation_runs (user_id, provider, model, prompt_version)
    values ('60000000-0000-4000-8000-000000000001', 'fake', 'fake', 'fake');
    raise exception 'Authenticated client could fabricate generation run';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.brain_insights (insight_type, title, statement, status, origin)
    values ('theme', 'AI sem run', 'Nao deve existir', 'draft', 'ai');
    raise exception 'AI insight without generation run was accepted';
  exception when insufficient_privilege or check_violation then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
do $$
begin
  if (select count(*) from public.brain_generation_runs) <> 1 then
    raise exception 'B must see only its generation run';
  end if;
  if exists (select 1 from public.brain_generation_runs where id = '64000000-0000-4000-8000-000000000001') then
    raise exception 'B read A generation run';
  end if;
end;
$$;

reset role;
rollback;
select 'PASS: trusted brain generation runs, context provenance and RLS' as result;
