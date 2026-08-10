-- Journal — private photo storage bucket + per-user access policies.
--
-- Objects are keyed as `<user_id>/<entry_id>/<photo_id>.<ext>`. Access is
-- granted only when the first path segment equals the requester's auth.uid(),
-- so a user can never read or write another user's photos.

insert into storage.buckets (id, name, public)
values ('journal-photos', 'journal-photos', false)
on conflict (id) do nothing;

drop policy if exists "journal photos read own" on storage.objects;
create policy "journal photos read own" on storage.objects
  for select using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "journal photos insert own" on storage.objects;
create policy "journal photos insert own" on storage.objects
  for insert with check (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "journal photos update own" on storage.objects;
create policy "journal photos update own" on storage.objects
  for update using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "journal photos delete own" on storage.objects;
create policy "journal photos delete own" on storage.objects
  for delete using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
