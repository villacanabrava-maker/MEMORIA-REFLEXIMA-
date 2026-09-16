create or replace function public.submit_reflection_for_review(p_reflection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reflections
  set status = 'review', approved_version_id = null, approved_at = null
  where id = p_reflection_id and user_id = auth.uid() and status in ('draft','review');
  if not found then raise exception 'reflection_not_editable'; end if;
end;
$$;

create or replace function public.return_reflection_to_draft(p_reflection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reflections
  set status = 'draft', approved_version_id = null, approved_at = null
  where id = p_reflection_id and user_id = auth.uid() and status = 'review';
  if not found then raise exception 'reflection_not_in_review'; end if;
end;
$$;

create or replace function public.approve_reflection(p_reflection_id uuid, p_version_id uuid)
returns void
language plpgsql
security definer
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
  if v_stage is distinct from 'revision' then raise exception 'invalid_approval_version'; end if;

  update public.reflections
  set status = 'approved', approved_version_id = p_version_id, approved_at = now()
  where id = p_reflection_id and user_id = auth.uid() and status = 'review';
  if not found then raise exception 'reflection_not_in_review'; end if;
end;
$$;

create or replace function public.archive_reflection(p_reflection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reflections
  set status = 'archived', approved_at = null
  where id = p_reflection_id and user_id = auth.uid() and status <> 'archived';
  if not found then raise exception 'reflection_not_archivable'; end if;
end;
$$;

revoke all on function public.submit_reflection_for_review(uuid) from public, anon;
revoke all on function public.return_reflection_to_draft(uuid) from public, anon;
revoke all on function public.approve_reflection(uuid, uuid) from public, anon;
revoke all on function public.archive_reflection(uuid) from public, anon;
grant execute on function public.submit_reflection_for_review(uuid) to authenticated;
grant execute on function public.return_reflection_to_draft(uuid) to authenticated;
grant execute on function public.approve_reflection(uuid, uuid) to authenticated;
grant execute on function public.archive_reflection(uuid) to authenticated;
