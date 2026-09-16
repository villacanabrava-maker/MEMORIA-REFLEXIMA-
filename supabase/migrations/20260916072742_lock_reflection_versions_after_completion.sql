drop policy if exists reflection_versions_insert_own on public.reflection_versions;
create policy reflection_versions_insert_own on public.reflection_versions
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and author_kind = 'user'
  and generation_run_id is null
  and stage in ('external','commentary','conflicts','plan','revision')
  and exists (
    select 1
    from public.reflections r
    where r.id = reflection_id
      and r.user_id = (select auth.uid())
      and r.status in ('draft','review')
  )
);
