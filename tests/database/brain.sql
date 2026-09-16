-- Disposable database only. Tests private brain insights, provenance links and append-only feedback.
begin;

insert into auth.users (id) values
  ('50000000-0000-4000-8000-000000000001'),
  ('50000000-0000-4000-8000-000000000002');

insert into public.library_documents (id, user_id, storage_key, file_name)
values
  ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'a/brain.pdf', 'Brain A.pdf'),
  ('51000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'b/brain.pdf', 'Brain B.pdf');

insert into public.library_evidence (id, user_id, document_id, source_kind, page_number, source_label, excerpt)
values
  ('52000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'page', 1, 'A pagina 1', 'Evidencia A'),
  ('52000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000002', 'page', 1, 'B pagina 1', 'Evidencia B');

insert into public.memory_nodes (id, user_id, node_type, title, reflection, status)
values
  ('53000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'concept', 'Memoria A', 'Reflexao A', 'confirmed'),
  ('53000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'concept', 'Memoria B', 'Reflexao B', 'confirmed');

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);

insert into public.brain_insights (insight_type, title, statement, status)
values ('thinking_pattern', 'Padrao A', 'Interpretacao rastreavel de A', 'draft');

do $$
declare
  insight_a uuid;
begin
  select id into insight_a from public.brain_insights where title = 'Padrao A';
  if insight_a is null then raise exception 'A could not create its brain insight'; end if;

  if exists (select 1 from public.brain_insights where origin <> 'manual') then
    raise exception 'Manual client-created insight did not keep manual origin';
  end if;

  insert into public.brain_insight_memories (insight_id, memory_id, role)
  values (insight_a, '53000000-0000-4000-8000-000000000001', 'supports');

  insert into public.brain_insight_evidence (insight_id, evidence_id, role)
  values (insight_a, '52000000-0000-4000-8000-000000000001', 'supports');

  insert into public.brain_feedback (insight_id, rating, comment)
  values (insight_a, 'partial', 'Precisa de contexto');

  begin
    insert into public.brain_insights (insight_type, title, statement, status, origin)
    values ('theme', 'Falso AI', 'Nao deveria aceitar origem do navegador', 'draft', 'ai');
    raise exception 'Authenticated client could set AI origin';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.brain_insight_memories (insight_id, memory_id, role)
    values (insight_a, '53000000-0000-4000-8000-000000000002', 'supports');
    raise exception 'Cross-owner memory link was accepted';
  exception when foreign_key_violation or insufficient_privilege then null;
  end;

  begin
    insert into public.brain_insight_evidence (insight_id, evidence_id, role)
    values (insight_a, '52000000-0000-4000-8000-000000000002', 'supports');
    raise exception 'Cross-owner evidence link was accepted';
  exception when foreign_key_violation or insufficient_privilege then null;
  end;

  begin
    update public.brain_feedback set rating = 'correct' where insight_id = insight_a;
    raise exception 'Historical feedback was mutable';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
insert into public.brain_insights (user_id, insight_type, title, statement, status)
values ('50000000-0000-4000-8000-000000000002', 'theme', 'Tema B', 'Interpretacao B', 'draft');

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);

do $$
begin
  if (select count(*) from public.brain_insights) <> 1 then
    raise exception 'A must see only its own brain insight';
  end if;
  if exists (select 1 from public.brain_insights where title = 'Tema B') then
    raise exception 'A read B brain insight';
  end if;
  if (select count(*) from public.brain_feedback) <> 1 then
    raise exception 'A feedback history is not isolated correctly';
  end if;
end;
$$;

reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.brain_insights;
    raise exception 'Anonymous brain insight select allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
select 'PASS: brain insights provenance, feedback history and RLS isolation' as result;
