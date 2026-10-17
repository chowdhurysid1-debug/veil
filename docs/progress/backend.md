# Progress: backend

One line per finished milestone: id, what shipped, commit hash.

## Contract requests

1. Add `DEMO_SITE_ID = "3f2b8c1e-5d4a-4b7e-9c1f-2a6d8e0b4c71"` next to `DEMO_IDENTITY` in `lib/contracts.ts`. `POST /api/clips` needs a `siteId`, and the seed creates Demo High School with exactly this id (the same id `MOCK_SITES[0]` uses), so the UI can send it without a sites endpoint.

## Milestones

- B1: migration (7 tables, RLS on with no policies, atomic `create_clip` RPC, append-only audit log, private `frames` and `vault` buckets) and idempotent seed (2 sites, 20 labeled seed events) generated from `lib/learning/seed.ts`. Written, not applied: waiting for Supabase keys (1a58b76)
