-- Disposable database only. Tests evidence provenance and anti-forgery guarantees.
begin;

insert into auth.users (id) values
  ('40000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000002');

insert into public.library_documents (id, user_id, storage_key, file_name)
values
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'a/book.pdf', 'Livro A.pdf'),
  ('41000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'b/book.pdf', 'Livro B.pdf');

insert into public.library_document_pages (document_id, user_id, page_number, content, character_count)
values
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 1, 'Antes mundo depois da evidencia.', 32),
  ('41000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 1, 'Texto privado do usuario B.', 26);

set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);

do $$
declare
  evidence_id uuid;
  affected integer;
begin
  begin
    insert into public.library_evidence(user_id, document_id, source_kind, page_number, source_label, excerpt)
    values ('40000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', 'page', 1, 'Inventada', 'Texto inventado');
    raise exception 'Direct evidence insert was accepted';
  exception when insufficient_privilege then null;
  end;

  select public.save_library_evidence(
    '41000000-0000-4000-8000-000000000001',
    'page',
    1,
    6,
    11,
    'Observacao humana'
  ) into evidence_id;

  if not exists (
    select 1 from public.library_evidence
    where id = evidence_id
      and user_id = '40000000-0000-4000-8000-000000000001'
      and excerpt = 'mundo'
      and start_offset = 6
      and end_offset = 11
      and context_before = 'Antes '
      and context_after = ' depois da evidencia.'
      and note = 'Observacao humana'
      and source_label = 'Livro A.pdf · Página 1'
      and source_updated_at is not null
  ) then raise exception 'Precise evidence was not derived from the source correctly'; end if;

  begin
    update public.library_evidence set excerpt = 'Texto adulterado' where id = evidence_id;
    raise exception 'Evidence excerpt update was accepted';
  exception when insufficient_privilege then null;
  end;

  update public.library_evidence set note = 'Nota revisada' where id = evidence_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner could not update evidence note'; end if;

  begin
    perform public.save_library_evidence(
      '41000000-0000-4000-8000-000000000002',
      'page',
      1,
      0,
      5,
      null
    );
    raise exception 'Cross-owner evidence was accepted';
  exception when others then
    if SQLERRM = 'Cross-owner evidence was accepted' then raise; end if;
  end;

  begin
    perform public.save_library_evidence(
      '41000000-0000-4000-8000-000000000001',
      'page',
      1,
      20,
      10,
      null
    );
    raise exception 'Invalid offsets were accepted';
  exception when others then
    if SQLERRM = 'Invalid offsets were accepted' then raise; end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', true);
do $$
begin
  if exists (select 1 from public.library_evidence) then
    raise exception 'B read A evidence';
  end if;
end;
$$;

reset role;
rollback;
select 'PASS: evidence provenance, precise offsets, anti-forgery and RLS' as result;
