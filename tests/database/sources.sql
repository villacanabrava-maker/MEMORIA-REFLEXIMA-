-- Disposable database only. Fictional users; all fixtures are rolled back.
-- Run with psql -v ON_ERROR_STOP=1. Assertions must check affected rows.
begin;
insert into auth.users (id) values
 ('10000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002');
insert into public.sources (user_id, title, content, created_at, updated_at)
values ('10000000-0000-4000-8000-000000000002', 'CI source B', 'Original B', '2000-01-01Z', '2000-01-01Z');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
insert into public.sources (title, content) values ('CI source A', E'  Original A\n\t');

do $$
declare affected integer; before_version timestamptz; source_id uuid;
begin
  if (select count(*) from public.sources) <> 1 then raise exception 'A must see exactly one own source'; end if;
  if not exists (select 1 from public.sources where title = 'CI source A' and user_id = '10000000-0000-4000-8000-000000000001' and content = E'  Original A\n\t') then raise exception 'Owner default or original text preservation failed'; end if;
  update public.sources set content = 'Unauthorized' where title = 'CI source B';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'A updated B source'; end if;
  delete from public.sources where title = 'CI source B';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'A deleted B source'; end if;
  begin
    insert into public.sources (title, content, user_id) values ('Spoofed', 'Text', '10000000-0000-4000-8000-000000000002');
    raise exception 'Explicit owner insert must be forbidden';
  exception when insufficient_privilege then null; end;
  begin
    update public.sources set user_id = '10000000-0000-4000-8000-000000000002';
    raise exception 'Owner update must be forbidden';
  exception when insufficient_privilege then null; end;
  begin
    update public.sources set id = '20000000-0000-4000-8000-000000000001';
    raise exception 'ID update must be forbidden';
  exception when insufficient_privilege then null; end;
  begin
    update public.sources set created_at = '2000-01-01Z';
    raise exception 'Creation timestamp update must be forbidden';
  exception when insufficient_privilege then null; end;
  begin
    update public.sources set updated_at = '2000-01-01Z';
    raise exception 'Version override must be forbidden';
  exception when insufficient_privilege then null; end;
  begin
    truncate public.sources;
    raise exception 'Authenticated truncate must be forbidden';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.sources (title, content) values (E' \n\t', 'Text');
    raise exception 'Whitespace title accepted';
  exception when check_violation then null; end;
  begin
    insert into public.sources (title, content) values ('Title', E' \n\t');
    raise exception 'Whitespace content accepted';
  exception when check_violation then null; end;
  begin
    insert into public.sources (title, content) values (repeat('x', 201), 'Text');
    raise exception 'Overlong title accepted';
  exception when check_violation then null; end;
  begin
    insert into public.sources (title, content) values ('Title', repeat('x', 100001));
    raise exception 'Overlong content accepted';
  exception when check_violation then null; end;

  select id, updated_at into source_id, before_version from public.sources where title = 'CI source A';
  update public.sources set content = 'Edited A' where id = source_id and updated_at = before_version;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'A could not update own current version'; end if;
  if not exists (select 1 from public.sources where id = source_id and updated_at > before_version) then raise exception 'Version did not increase'; end if;
  update public.sources set content = 'Stale update' where id = source_id and updated_at = before_version;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Stale update overwrote a newer version'; end if;
  delete from public.sources where id = source_id and updated_at = before_version;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Stale delete removed a newer version'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
do $$
declare affected integer;
begin
  if (select count(*) from public.sources) <> 1 then raise exception 'B must see exactly one own source'; end if;
  if exists (select 1 from public.sources where title = 'CI source A') then raise exception 'B read A source'; end if;
  update public.sources set content = 'Unauthorized' where title = 'CI source A';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'B updated A source'; end if;
  delete from public.sources where title = 'CI source A';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'B deleted A source'; end if;
  update public.sources set content = 'Edited B' where title = 'CI source B';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'B could not update own source'; end if;
  if not exists (select 1 from public.sources where title = 'CI source B' and updated_at > '2000-01-01Z'::timestamptz and created_at = '2000-01-01Z'::timestamptz) then raise exception 'Timestamp trigger failed'; end if;
  delete from public.sources where title = 'CI source B';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'B could not delete own source'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  if (select count(*) from public.sources) <> 0 then raise exception 'Missing identity exposed a source'; end if;
  begin
    insert into public.sources (title, content) values ('No user', 'Text');
    raise exception 'Missing identity inserted a source';
  exception when insufficient_privilege or not_null_violation then null; end;
end;
$$;
reset role;
set local role anon;
do $$
begin
  begin perform 1 from public.sources; raise exception 'Anonymous select allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.sources (title, content) values ('Anon', 'Text'); raise exception 'Anonymous insert allowed'; exception when insufficient_privilege then null; end;
  begin update public.sources set content = 'Anon'; raise exception 'Anonymous update allowed'; exception when insufficient_privilege then null; end;
  begin delete from public.sources; raise exception 'Anonymous delete allowed'; exception when insufficient_privilege then null; end;
end;
$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$
declare affected integer;
begin
  if not exists (select 1 from public.sources where content = 'Edited A') then raise exception 'A source was changed by another identity or stale request'; end if;
  delete from public.sources where title = 'CI source A';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'A could not delete own source'; end if;
end;
$$;
reset role;
rollback;
select 'PASS: ownership, RLS, anonymous denial, validation, timestamps, concurrency and CRUD' as result;
