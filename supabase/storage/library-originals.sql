-- Apply in Supabase only after the Storage management path is available.
-- This file is intentionally outside supabase/migrations because the disposable
-- PostgreSQL CI database does not contain Supabase Storage schemas.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('library-originals-v1','library-originals-v1',false,2000000,array['application/pdf','text/plain','text/markdown']::text[])
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists library_originals_select_own on storage.objects;
drop policy if exists library_originals_insert_own on storage.objects;
drop policy if exists library_originals_delete_own on storage.objects;

create policy library_originals_select_own on storage.objects
for select to authenticated
using (bucket_id='library-originals-v1' and (storage.foldername(name))[1]=(select auth.uid()::text));

create policy library_originals_insert_own on storage.objects
for insert to authenticated
with check (bucket_id='library-originals-v1' and (storage.foldername(name))[1]=(select auth.uid()::text));

create policy library_originals_delete_own on storage.objects
for delete to authenticated
using (bucket_id='library-originals-v1' and (storage.foldername(name))[1]=(select auth.uid()::text));
