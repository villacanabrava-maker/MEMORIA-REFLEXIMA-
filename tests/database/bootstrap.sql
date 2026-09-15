-- ONLY for the fresh disposable PostgreSQL CI service. NEVER run on Supabase.
-- Models the auth.uid() contract, not JWT verification, Auth or PostgREST.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable set search_path = '' as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
revoke all on table auth.users from public, anon, authenticated;
