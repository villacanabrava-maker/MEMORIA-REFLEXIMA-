-- Disposable database only. Tests the private memory graph and same-owner provenance links.
begin;

insert into auth.users (id) values
  ('50000000-0000-4000-8000-000000000001'),
  ('50000000-0000-4000-8000-000000000002');

insert into public.library_documents (id, user_id, storage_key, file_name)
values
  ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'a/source.pdf', 'Fonte A.pdf'),
  ('51000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'b/source.pdf', 'Fonte B.pdf');

insert into public.library_document_pages (document_id, user_id, page_number, content, character_count)
values
  ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 1, 'Esperanca exige paciencia.', 25),
  ('51000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 1, 'Conteudo privado B.', 19);

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);

select public.save_library_evidence('51000000-0000-4000-8000-000000000001', 'page', 1, 0, 9, null);
insert into public.memory_nodes(node_type, title, reflection, status)
values ('concept', 'Esperança', 'A esperança aparece ligada à espera ativa.', 'confirmed');
insert into public.memory_nodes(node_type, title, reflection)
values ('concept', 'Paciência', 'Conceito relacionado.');

do $$
declare
  hope_id uuid;
  patience_id uuid;
  evidence_id uuid;
  affected integer;
begin
  select id into hope_id from public.memory_nodes where title = 'Esperança';
  select id into patience_id from public.memory_nodes where title = 'Paciência';
  select id into evidence_id from public.library_evidence limit 1;

  insert into public.memory_evidence(memory_id, evidence_id, role, note)
  values (hope_id, evidence_id, 'supports', 'Base textual');

  insert into public.memory_relations(from_memory_id, to_memory_id, relation_type, note)
  values (hope_id, patience_id, 'related_to', 'Relação confirmada pelo usuário');

  if (select count(*) from public.memory_nodes) <> 2 then raise exception 'A should see exactly two own memories'; end if;
  if (select count(*) from public.memory_evidence) <> 1 then raise exception 'Evidence link missing'; end if;
  if (select count(*) from public.memory_relations) <> 1 then raise exception 'Memory relation missing'; end if;

  begin
    update public.memory_nodes set user_id = '50000000-0000-4000-8000-000000000002' where id = hope_id;
    raise exception 'Memory owner update accepted';
  exception when insufficient_privilege then null;
  end;

  update public.memory_nodes set reflection = 'Reflexão revisada' where id = hope_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner could not edit own memory'; end if;

  begin
    insert into public.memory_evidence(memory_id, evidence_id, role)
    values (patience_id, '00000000-0000-4000-8000-000000000999', 'supports');
    raise exception 'Foreign evidence link accepted';
  exception when foreign_key_violation then null;
  end;

  begin
    insert into public.memory_relations(from_memory_id, to_memory_id, relation_type)
    values (hope_id, hope_id, 'related_to');
    raise exception 'Self relation accepted';
  exception when check_violation then null;
  end;
end;
$$;

reset role;
insert into public.memory_nodes(user_id, node_type, title, reflection)
values ('50000000-0000-4000-8000-000000000002', 'idea', 'Memória B', 'Privada');

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
do $$
begin
  if exists (select 1 from public.memory_nodes where title = 'Memória B') then raise exception 'A read B memory'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000002', true);
do $$
begin
  if (select count(*) from public.memory_nodes) <> 1 then raise exception 'B should see exactly one own memory'; end if;
  if exists (select 1 from public.memory_evidence) then raise exception 'B read A memory evidence'; end if;
  if exists (select 1 from public.memory_relations) then raise exception 'B read A memory relations'; end if;
end;
$$;

reset role;
rollback;
select 'PASS: private memory nodes, evidence links, relations and RLS' as result;
