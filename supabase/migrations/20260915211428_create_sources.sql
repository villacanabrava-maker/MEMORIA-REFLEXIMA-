-- Private text library. Applied to the authorized test project.
-- No file upload, extraction, embeddings or AI processing in this migration.
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_title_valid check (char_length(title) between 1 and 200 and title ~ '[^[:space:]]'),
  constraint sources_content_valid check (char_length(content) between 1 and 100000 and content ~ '[^[:space:]]')
);
comment on table public.sources is 'Private user-authored text sources; no automatic extraction or AI processing.';
create index sources_user_created_at_idx on public.sources (user_id, created_at desc, id desc);
create function public.sources_touch_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;
revoke all on function public.sources_touch_updated_at() from public, anon, authenticated;
create trigger sources_touch_updated_at before update on public.sources
for each row execute function public.sources_touch_updated_at();
alter table public.sources enable row level security;
revoke all on table public.sources from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, delete on table public.sources to authenticated;
grant insert (title, content) on table public.sources to authenticated;
grant update (title, content) on table public.sources to authenticated;
create policy sources_select_own on public.sources for select to authenticated using ((select auth.uid()) = user_id);
create policy sources_insert_own on public.sources for insert to authenticated with check ((select auth.uid()) = user_id);
create policy sources_update_own on public.sources for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy sources_delete_own on public.sources for delete to authenticated using ((select auth.uid()) = user_id);
