-- Supabase-only operational bootstrap for the universal library processing runtime.
-- This file is NOT applied by the disposable PostgreSQL CI migration loop.
-- It is intended to document/recreate Supabase-specific infrastructure that
-- depends on pgmq, pg_cron, pg_net and Vault.
-- Never place decrypted secrets in this file.

create extension if not exists pgmq with schema pgmq;
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

do $$
begin
  if not exists (select 1 from pgmq.meta where queue_name = 'library_processing') then
    perform pgmq.create('library_processing');
  end if;
end
$$;

create or replace function public.verify_library_worker_token(p_token text)
returns boolean
language sql
security definer
set search_path = public, vault, pg_temp
as $$
  select exists(
    select 1
    from vault.decrypted_secrets
    where name = 'library_worker_token'
      and decrypted_secret = p_token
  );
$$;

create or replace function public.worker_claim_library_processing(p_visibility_seconds integer default 120)
returns table(msg_id bigint, read_ct integer, message jsonb)
language sql
security definer
set search_path = public, pgmq, pg_temp
as $$
  select msg_id, read_ct, message
  from pgmq.read('library_processing', greatest(30, least(p_visibility_seconds, 600)), 1);
$$;

create or replace function public.worker_complete_library_processing(p_msg_id bigint)
returns boolean
language sql
security definer
set search_path = public, pgmq, pg_temp
as $$
  select pgmq.delete('library_processing', p_msg_id);
$$;

create or replace function public.worker_requeue_library_processing(p_message jsonb, p_delay_seconds integer default 0)
returns bigint
language sql
security definer
set search_path = public, pgmq, pg_temp
as $$
  select pgmq.send('library_processing', p_message, greatest(0, least(p_delay_seconds, 3600)));
$$;

create or replace function public.enqueue_library_file_processing(
  p_storage_key text,
  p_file_name text,
  p_mime_type text default null,
  p_file_size bigint default null,
  p_force boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pgmq, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_document public.library_documents;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  if p_storage_key is null or length(p_storage_key) < 1
     or p_file_name is null or length(p_file_name) < 1 then
    raise exception 'invalid file';
  end if;

  select * into v_document
  from public.library_documents
  where user_id = v_user and storage_key = p_storage_key;

  if found and not p_force then
    return v_document.id;
  end if;

  insert into public.library_documents(
    user_id, storage_key, file_name, mime_type, file_size,
    status, processor_strategy, processed_pages, processed_bytes,
    last_error, completed_at
  )
  values (
    v_user, p_storage_key, p_file_name, p_mime_type, p_file_size,
    'queued', 'classify', 0, 0, null, null
  )
  on conflict (user_id, storage_key) do update set
    file_name = excluded.file_name,
    mime_type = coalesce(excluded.mime_type, public.library_documents.mime_type),
    file_size = coalesce(excluded.file_size, public.library_documents.file_size),
    status = 'queued',
    processor_strategy = 'classify',
    last_error = null,
    completed_at = null
  returning * into v_document;

  perform pgmq.send(
    'library_processing',
    jsonb_build_object(
      'document_id', v_document.id,
      'user_id', v_user,
      'storage_key', p_storage_key,
      'file_name', p_file_name,
      'mime_type', p_mime_type,
      'file_size', p_file_size
    )
  );

  return v_document.id;
end;
$$;

-- The secret value itself must be created separately in Supabase Vault with
-- the name `library_worker_token`. Never commit the decrypted token.

-- Recreate the 30-second trigger only after the Edge Function has been deployed.
-- The project ref below is public project routing metadata, not a secret.
select cron.unschedule(jobid)
from cron.job
where jobname = 'library-processing-worker-every-30-seconds';

select cron.schedule(
  'library-processing-worker-every-30-seconds',
  '30 seconds',
  $$
    select net.http_post(
      url := 'https://qkwcermdjgmvenzskevw.supabase.co/functions/v1/library-processing-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-library-worker-token', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'library_worker_token'
          limit 1
        )
      ),
      body := jsonb_build_object('source', 'cron', 'time', now()),
      timeout_milliseconds := 5000
    ) as request_id;
  $$
);
