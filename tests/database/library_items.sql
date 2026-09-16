-- Disposable database only. Tests ownership, automatic catalog creation and origin integrity.
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

-- The insert triggers must create exactly one catalog row for each technical origin.
do $$
begin
  if (select count(*) from public.library_items) <> 4 then
    raise exception 'Automatic catalog creation did not create four items';
  end if;
  if not exists (
    select 1 from public.library_items
    where document_id = '31000000-0000-4000-8000-000000000001'
      and title = 'A.pdf' and kind = 'document' and authorship = 'unknown'
  ) then raise exception 'Document catalog item missing'; end if;
  if not exists (
    select 1 from public.library_items
    where source_id = '32000000-0000-4000-8000-000000000001'
      and title = 'Texto A' and kind = 'text' and authorship = 'unknown'
  ) then raise exception 'Source catalog item missing'; end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);

do $$
begin
  if (select count(*) from public.library_items) <> 2 then
    raise exception 'A must see exactly its document and source catalog items';
  end if;

  if exists (select 1 from public.library_items where user_id = '30000000-0000-4000-8000-000000000002') then
    raise exception 'A read B catalog items';
  end if;

  begin
    insert into public.library_items (user_id, title, document_id)
    values ('30000000-0000-4000-8000-000000000002', 'Spoof B', '31000000-0000-4000-8000-000000000002');
    raise exception 'Spoofed owner insert was accepted';
  exception when insufficient_privilege or unique_violation then null;
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
  exception when check_violation or unique_violation then null;
  end;

  begin
    update public.library_items set authorship = 'invented'
    where document_id = '31000000-0000-4000-8000-000000000001';
    raise exception 'Invalid authorship was accepted';
  exception when check_violation then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
do $$
begin
  if (select count(*) from public.library_items) <> 2 then
    raise exception 'B must see exactly its document and source catalog items';
  end if;
  if exists (select 1 from public.library_items where user_id = '30000000-0000-4000-8000-000000000001') then
    raise exception 'B read A catalog items';
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
select 'PASS: library_items auto-creation, ownership, RLS and origin integrity' as result;
