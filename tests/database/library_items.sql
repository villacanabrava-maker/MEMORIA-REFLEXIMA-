-- Disposable database only. Tests ownership and origin integrity of library_items.
begin;

insert into auth.users (id) values
  ('30000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002');

insert into public.library_documents (id, user_id, storage_key, file_name)
values
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'a/file.pdf', 'A.pdf'),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'b/file.pdf', 'B.pdf');

insert into public.sources (id, user_id, title, content)
values
  ('32000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Texto A', 'Conteudo A'),
  ('32000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Texto B', 'Conteudo B');

insert into public.library_items (user_id, title, document_id)
values ('30000000-0000-4000-8000-000000000002', 'Item B', '31000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);

insert into public.library_items (user_id, title, document_id)
values ('30000000-0000-4000-8000-000000000001', 'Item A', '31000000-0000-4000-8000-000000000001');

do $$
begin
  if (select count(*) from public.library_items) <> 1 then
    raise exception 'A must see only its own catalog item';
  end if;

  if exists (select 1 from public.library_items where title = 'Item B') then
    raise exception 'A read B catalog item';
  end if;

  begin
    insert into public.library_items (user_id, title, document_id)
    values ('30000000-0000-4000-8000-000000000002', 'Spoof B', '31000000-0000-4000-8000-000000000002');
    raise exception 'Spoofed owner insert was accepted';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.library_items (user_id, title, document_id)
    values ('30000000-0000-4000-8000-000000000001', 'Cross owner', '31000000-0000-4000-8000-000000000002');
    raise exception 'Cross-owner document reference was accepted';
  exception when foreign_key_violation or unique_violation then null;
  end;

  begin
    insert into public.library_items (user_id, title, document_id, source_id)
    values (
      '30000000-0000-4000-8000-000000000001',
      'Two origins',
      '31000000-0000-4000-8000-000000000001',
      '32000000-0000-4000-8000-000000000001'
    );
    raise exception 'Item with two origins was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into public.library_items (user_id, title, document_id, authorship)
    values ('30000000-0000-4000-8000-000000000001', 'Bad authorship', '31000000-0000-4000-8000-000000000001', 'invented');
    raise exception 'Invalid authorship was accepted';
  exception when check_violation or unique_violation then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
do $$
begin
  if (select count(*) from public.library_items) <> 1 then
    raise exception 'B must see only its own catalog item';
  end if;
  if exists (select 1 from public.library_items where title = 'Item A') then
    raise exception 'B read A catalog item';
  end if;
end;
$$;

reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.library_items;
    raise exception 'Anonymous select allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
select 'PASS: library_items ownership, RLS and origin integrity' as result;
