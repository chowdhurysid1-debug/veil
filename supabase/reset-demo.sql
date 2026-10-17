-- Reset the demo to a clean slate, then paste seed.sql to restore the seed history.
-- Run in the Supabase dashboard SQL editor before a rehearsal or the live demo.
--
-- Removes every uploaded clip with its frames, alerts, labels, and locked faces, so the
-- hug false alarm can be taught again. Seed rows are removed too, so edits to
-- lib/learning/seed.ts apply when seed.sql runs next.
--
-- The audit log is append-only and is never touched. A clip with a face that was ever
-- unlocked stays, because its audit entry points at that face.
--
-- Files in the frames, vault, and videos buckets are not removed here. They are private
-- and unreachable once their rows are gone. Empty the buckets in the Storage page to
-- reclaim the space.

delete from public.clips c
where not exists (
  select 1
  from public.face_vault f
  join public.unlock_audit a on a.face_id = f.id
  where f.clip_id = c.id
);
