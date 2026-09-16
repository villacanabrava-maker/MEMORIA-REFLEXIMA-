-- Disposable database only. Tests versioned reflections, controlled transitions and RLS isolation.
begin;

insert into auth.users (id) values
  ('60000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000000002');

insert into public.memory_nodes (id, user_id, node_type, title, reflection, status)
values
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'concept', 'Memória A', 'Contexto A', 'confirmed'),
  ('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 'concept', 'Memória B', 'Contexto B', 'confirmed');

insert into public.reflections (id, user_id, title)
values ('62000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 'Reflexão B');

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);

insert into public.reflections (title) values ('Reflexão A');

do $$
declare
  reflection_a uuid;
  revision_a uuid;
  affected integer;
begin
  select id into reflection_a from public.reflections where title = 'Reflexão A';
  if reflection_a is null then raise exception 'A could not create reflection'; end if;

  if (select status from public.reflections where id = reflection_a) <> 'draft' then
    raise exception 'New reflection did not start as draft';
  end if;

  begin
    insert into public.reflections (title, status) values ('Atalho inválido', 'review');
    raise exception 'Client could choose reflection status on insert';
  exception when insufficient_privilege then null;
  end;

  insert into public.reflection_versions (reflection_id, stage, content)
  values (reflection_a, 'external', 'Texto externo para análise.');

  insert into public.reflection_versions (reflection_id, stage, content)
  values (reflection_a, 'revision', 'Minha versão revisada e pronta para aprovação.');

  select id into revision_a
  from public.reflection_versions
  where reflection_id = reflection_a and stage = 'revision'
  order by created_at desc limit 1;

  begin
    insert into public.reflection_versions (reflection_id, stage, content)
    values (reflection_a, 'ai_draft', 'Cliente fingindo ser IA');
    raise exception 'Client could create ai_draft';
  exception when insufficient_privilege or check_violation then null;
  end;

  begin
    update public.reflection_versions set content = 'Texto adulterado' where id = revision_a;
    raise exception 'Reflection version was mutable';
  exception when insufficient_privilege then null;
  end;

  insert into public.reflection_memories (reflection_id, memory_id, role)
  values (reflection_a, '61000000-0000-4000-8000-000000000001', 'context');

  begin
    insert into public.reflection_memories (reflection_id, memory_id, role)
    values (reflection_a, '61000000-0000-4000-8000-000000000002', 'context');
    raise exception 'Cross-owner memory link accepted';
  exception when foreign_key_violation then null;
  end;

  perform public.submit_reflection_for_review(reflection_a);
  if (select status from public.reflections where id = reflection_a) <> 'review' then
    raise exception 'Reflection did not enter review';
  end if;

  perform public.approve_reflection(reflection_a, revision_a);
  if (select status from public.reflections where id = reflection_a) <> 'approved' then
    raise exception 'Reflection was not approved';
  end if;
  if (select approved_version_id from public.reflections where id = reflection_a) <> revision_a then
    raise exception 'Approved version was not preserved';
  end if;

  begin
    perform public.submit_reflection_for_review('62000000-0000-4000-8000-000000000002');
    raise exception 'A transitioned B reflection';
  exception when others then
    if SQLERRM = 'A transitioned B reflection' then raise; end if;
  end;

  perform public.archive_reflection(reflection_a);
  if (select status from public.reflections where id = reflection_a) <> 'archived' then
    raise exception 'Reflection was not archived';
  end if;

  select count(*) into affected from public.reflection_versions where reflection_id = reflection_a;
  if affected <> 2 then raise exception 'Version history was lost'; end if;
end;
$$;

do $$
begin
  if exists (select 1 from public.reflections where title = 'Reflexão B') then
    raise exception 'A read B reflection';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
do $$
begin
  if (select count(*) from public.reflections) <> 1 then raise exception 'B should see exactly one own reflection'; end if;
  if exists (select 1 from public.reflection_versions) then raise exception 'B read A reflection versions'; end if;
  if exists (select 1 from public.reflection_memories) then raise exception 'B read A reflection memory links'; end if;
end;
$$;

reset role;
rollback;
select 'PASS: versioned reflections, controlled approval, immutable history and RLS isolation' as result;
