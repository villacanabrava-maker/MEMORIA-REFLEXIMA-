alter table public.reflections drop constraint if exists reflections_approval_state_valid;
alter table public.reflections
  add constraint reflections_approval_state_valid check (
    (status = 'approved' and approved_version_id is not null and approved_at is not null)
    or (status in ('draft','review') and approved_version_id is null and approved_at is null)
    or (status = 'archived' and ((approved_version_id is null and approved_at is null) or (approved_version_id is not null and approved_at is not null)))
  );

create or replace function public.archive_reflection(p_reflection_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reflections
  set status = 'archived'
  where id = p_reflection_id and user_id = auth.uid() and status <> 'archived';
  if not found then raise exception 'reflection_not_archivable'; end if;
end;
$$;

revoke all on function public.archive_reflection(uuid) from public, anon;
grant execute on function public.archive_reflection(uuid) to authenticated;
