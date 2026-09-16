revoke execute on function public.verify_library_worker_token(text) from public, anon, authenticated;
revoke execute on function public.worker_claim_library_processing(integer) from public, anon, authenticated;
revoke execute on function public.worker_complete_library_processing(bigint) from public, anon, authenticated;
revoke execute on function public.worker_requeue_library_processing(jsonb, integer) from public, anon, authenticated;

grant execute on function public.verify_library_worker_token(text) to service_role;
grant execute on function public.worker_claim_library_processing(integer) to service_role;
grant execute on function public.worker_complete_library_processing(bigint) to service_role;
grant execute on function public.worker_requeue_library_processing(jsonb, integer) to service_role;

revoke execute on function public.enqueue_library_file_processing(text, text, text, bigint, boolean) from anon;
