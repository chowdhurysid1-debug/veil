# Supabase setup for Veil

Two SQL files, pasted into the Supabase dashboard. No CLI needed.

1. Create the project, then add these to `.env.local` (and later to Vercel):
   - `NEXT_PUBLIC_SUPABASE_URL`: Project Settings, Data API, Project URL
   - `SUPABASE_SECRET_KEY`: Project Settings, API Keys, a secret key (`sb_secret_...`). Server only. Never prefix it with `NEXT_PUBLIC_`.
   - `VEIL_SIGNING_SECRET` and `VEIL_VAULT_KEY`: any two different random strings of at least 32 characters, for example from `openssl rand -base64 48`.
2. Open SQL Editor, paste all of `migrations/20261016000000_veil_schema.sql`, and run it once. It creates the tables, turns on RLS, adds the `create_clip` function, makes the audit log append-only, and creates the private `frames` and `vault` buckets.
3. Paste all of `seed.sql` and run it. It adds the two demo sites and 20 labeled seed events. Running it again changes nothing.
4. Paste `migrations/20261017000000_blurred_videos.sql` and run it once. It creates the private `videos` bucket for each clip's fully blurred MP4.

## Before every rehearsal and the live demo

Paste `reset-demo.sql`, then `seed.sql`. The reset removes every uploaded clip and label, so the hug false alarm can be taught again from scratch. The audit log is never touched, and a clip with a face that was ever unlocked stays because its audit entry points at it.

`seed.sql` is generated. To change seed data, edit `lib/learning/seed.ts`, then run `npx tsx scripts/seed-sql.mts`.

## What the server can and cannot do

- RLS is on for every table with no policies, so the browser keys can read nothing.
- Blurred frames, blurred videos, and encrypted face crops sit in private buckets and are only reachable through signed URLs that expire (10 minutes for frames and videos, 30 seconds for a face).
- Only the browser that uploaded a clip can attach its blurred video: the upload needs an HMAC token returned with the clip, and storage refuses a second video.
- Face keys are stored wrapped with `VEIL_VAULT_KEY`. A database leak alone does not reveal a face.
- `unlock_audit` rejects updates, deletes, and truncates.

Built with Chewbacca
