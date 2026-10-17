-- Blurred videos, approved by Sid on 2026-10-17.
-- Run once in the Supabase dashboard SQL editor, after 20261016000000_veil_schema.sql.
--
-- The browser renders each clip with every head blurred and uploads it here through a
-- one-time signed URL. The original file never leaves the browser. Private, like frames:
-- read only through signed URLs that expire after 10 minutes. One object per clip, at
-- "<clip id>.mp4", so no table column is needed.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('videos', 'videos', false, 20971520, array['video/mp4'])
on conflict (id) do nothing;
