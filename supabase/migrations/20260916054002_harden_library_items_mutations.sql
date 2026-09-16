revoke all on table public.library_items from authenticated;
grant select on table public.library_items to authenticated;
grant update (
  title,
  kind,
  authorship,
  author_name,
  published_year,
  category,
  theme,
  description,
  retrieval_enabled
) on table public.library_items to authenticated;

drop policy if exists library_items_insert_own on public.library_items;
drop policy if exists library_items_delete_own on public.library_items;
