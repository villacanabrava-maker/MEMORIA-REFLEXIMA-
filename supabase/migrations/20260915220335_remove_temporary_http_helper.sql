-- Remove only the temporary setup helper. Never cascade into other objects.
-- Fresh installations do not create this helper, so this is normally a no-op.
do $$
begin
  if exists (select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='http' and n.nspname='test_setup_http') then
    execute 'drop extension http restrict';
  end if;
  if exists (select 1 from pg_namespace where nspname='test_setup_http') then
    execute 'drop schema test_setup_http restrict';
  end if;
end;
$$;
