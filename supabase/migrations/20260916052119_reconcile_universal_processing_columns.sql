alter table public.library_documents
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists processor_strategy text not null default 'classify',
  add column if not exists processed_bytes bigint not null default 0,
  add column if not exists pages_with_text integer not null default 0,
  add column if not exists pages_without_text integer not null default 0,
  add column if not exists completed_at timestamptz;

alter table public.library_documents drop constraint if exists library_documents_status_check;
alter table public.library_documents add constraint library_documents_status_check
  check (status in ('pending','queued','processing','completed','needs_ocr','needs_transcription','preserved','error'));
