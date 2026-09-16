do $$
begin
  if to_regprocedure('public.verify_library_worker_token(text)') is not null then
    revoke execute on function public.verify_library_worker_token(text) from public, anon, authenticated;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      grant execute on function public.verify_library_worker_token(text) to service_role;
    end if;
  end if;

  if to_regprocedure('public.worker_claim_library_processing(integer)') is not null then
    revoke execute on function public.worker_claim_library_processing(integer) from public, anon, authenticated;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      grant execute on function public.worker_claim_library_processing(integer) to service_role;
    end if;
  end if;

  if to_regprocedure('public.worker_complete_library_processing(bigint)') is not null then
    revoke execute on function public.worker_complete_library_processing(bigint) from public, anon, authenticated;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      grant execute on function public.worker_complete_library_processing(bigint) to service_role;
    end if;
  end if;

  if to_regprocedure('public.worker_requeue_library_processing(jsonb,integer)') is not null then
    revoke execute on function public.worker_requeue_library_processing(jsonb, integer) from public, anon, authenticated;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      grant execute on function public.worker_requeue_library_processing(jsonb, integer) to service_role;
    end if;
  end if;

  if to_regprocedure('public.enqueue_library_file_processing(text,text,text,bigint,boolean)') is not null then
    revoke execute on function public.enqueue_library_file_processing(text, text, text, bigint, boolean) from anon;
  end if;
end;
$$;
