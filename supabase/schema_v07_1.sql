-- acoffee — v0.7.1 (Avatar upload) additive migration.
--
-- Adds:
--   * profiles.avatar_url   — public URL of the user's uploaded avatar
--   * storage bucket `avatars` (public-readable)
--   * Storage RLS so users can only write to their own folder
--
-- Run AFTER schema_v07.sql. Idempotent: safe to re-apply.
--
-- Path scheme: `{auth.uid()}/avatar.webp` — one file per user, upserted on
-- each new upload. Public read so OG image generation + `<img>` on the card
-- can fetch without auth headers; write/update/delete scoped to the
-- authenticated owner via storage.foldername(name)[1] = auth.uid()::text.

alter table profiles
  add column if not exists avatar_url text;

-- Storage bucket. `on conflict do nothing` so re-applying the migration
-- doesn't error if you created the bucket manually in the Dashboard first.
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Storage RLS. Drop+recreate so re-running stays clean.
drop policy if exists avatars_read_public on storage.objects;
create policy avatars_read_public on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
