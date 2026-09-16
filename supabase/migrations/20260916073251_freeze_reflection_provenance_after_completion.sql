drop policy if exists reflection_memories_insert_own on public.reflection_memories;
drop policy if exists reflection_memories_update_own on public.reflection_memories;
drop policy if exists reflection_memories_delete_own on public.reflection_memories;
create policy reflection_memories_insert_own on public.reflection_memories for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.reflections r where r.id = reflection_id and r.user_id = (select auth.uid()) and r.status in ('draft','review')
  )
);
create policy reflection_memories_update_own on public.reflection_memories for update to authenticated using (
  (select auth.uid()) = user_id and exists (
    select 1 from public.reflections r where r.id = reflection_id and r.user_id = (select auth.uid()) and r.status in ('draft','review')
  )
) with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.reflections r where r.id = reflection_id and r.user_id = (select auth.uid()) and r.status in ('draft','review')
  )
);
create policy reflection_memories_delete_own on public.reflection_memories for delete to authenticated using (
  (select auth.uid()) = user_id and exists (
    select 1 from public.reflections r where r.id = reflection_id and r.user_id = (select auth.uid()) and r.status in ('draft','review')
  )
);

drop policy if exists reflection_evidence_insert_own on public.reflection_evidence;
drop policy if exists reflection_evidence_update_own on public.reflection_evidence;
drop policy if exists reflection_evidence_delete_own on public.reflection_evidence;
create policy reflection_evidence_insert_own on public.reflection_evidence for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.reflections r where r.id = reflection_id and r.user_id = (select auth.uid()) and r.status in ('draft','review')
  )
);
create policy reflection_evidence_update_own on public.reflection_evidence for update to authenticated using (
  (select auth.uid()) = user_id and exists (
    select 1 from public.reflections r where r.id = reflection_id and r.user_id = (select auth.uid()) and r.status in ('draft','review')
  )
) with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.reflections r where r.id = reflection_id and r.user_id = (select auth.uid()) and r.status in ('draft','review')
  )
);
create policy reflection_evidence_delete_own on public.reflection_evidence for delete to authenticated using (
  (select auth.uid()) = user_id and exists (
    select 1 from public.reflections r where r.id = reflection_id and r.user_id = (select auth.uid()) and r.status in ('draft','review')
  )
);

drop policy if exists reflection_insights_insert_own on public.reflection_insights;
drop policy if exists reflection_insights_update_own on public.reflection_insights;
drop policy if exists reflection_insights_delete_own on public.reflection_insights;
create policy reflection_insights_insert_own on public.reflection_insights for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.reflections r where r.id = reflection_id and r.user_id = (select auth.uid()) and r.status in ('draft','review')
  )
);
create policy reflection_insights_update_own on public.reflection_insights for update to authenticated using (
  (select auth.uid()) = user_id and exists (
    select 1 from public.reflections r where r.id = reflection_id and r.user_id = (select auth.uid()) and r.status in ('draft','review')
  )
) with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.reflections r where r.id = reflection_id and r.user_id = (select auth.uid()) and r.status in ('draft','review')
  )
);
create policy reflection_insights_delete_own on public.reflection_insights for delete to authenticated using (
  (select auth.uid()) = user_id and exists (
    select 1 from public.reflections r where r.id = reflection_id and r.user_id = (select auth.uid()) and r.status in ('draft','review')
  )
);
