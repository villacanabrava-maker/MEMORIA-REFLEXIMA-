revoke insert on table public.reflections from authenticated;
grant insert (title) on table public.reflections to authenticated;

drop policy if exists reflection_versions_insert_own on public.reflection_versions;
create policy reflection_versions_insert_own on public.reflection_versions
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and author_kind = 'user'
  and generation_run_id is null
  and stage in ('external','commentary','conflicts','plan','revision')
);

create or replace function public.approve_reflection(p_reflection_id uuid, p_version_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_stage text;
begin
  select stage into v_stage
  from public.reflection_versions
  where id = p_version_id
    and reflection_id = p_reflection_id
    and user_id = auth.uid();

  if v_stage is distinct from 'revision' then
    raise exception 'invalid_approval_version';
  end if;

  update public.reflections
  set status = 'approved', approved_version_id = p_version_id, approved_at = now()
  where id = p_reflection_id
    and user_id = auth.uid()
    and status = 'review';

  if not found then raise exception 'reflection_not_in_review'; end if;
end;
$$;
