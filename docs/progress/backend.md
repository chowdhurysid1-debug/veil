# Progress: backend

One line per finished milestone: id, what shipped, commit hash.

## Contract requests

1. Add `DEMO_SITE_ID = "3f2b8c1e-5d4a-4b7e-9c1f-2a6d8e0b4c71"` next to `DEMO_IDENTITY` in `lib/contracts.ts`. `POST /api/clips` needs a `siteId`, and the seed creates Demo High School with exactly this id (the same id `MOCK_SITES[0]` uses), so the UI can send it without a sites endpoint.

## Known risks

- No authentication on any route, by design: the SPEC scopes out real login and uses one hardcoded demo identity. Anyone with the deployed URL can upload clips and unlock faces (each unlock is still written to the audit log first). Before sharing a public URL, turn on Vercel Deployment Protection or add Supabase auth.
- The original video never reaches the server, so `originalSha256` is computed in the browser. The HMAC stamp pins that hash to the server's own `stampedAt` time; it cannot prove the browser hashed the true original.

## Milestones

- B1: migration (7 tables, RLS on with no policies, atomic `create_clip` RPC, append-only audit log, private `frames` and `vault` buckets) and idempotent seed (2 sites, 20 labeled seed events) generated from `lib/learning/seed.ts`. Written, not applied: waiting for Supabase keys (1a58b76)
- B2: server-only Supabase client on the secret key, env validation that names missing vars and never echoes values, strict base64 and JPEG checks, storage paths, signed URLs in request order, bounded-concurrency uploads, 17 tests (02b13f3)
- B3: `POST /api/clips` validates the contract, checks each frame is a JPEG matching its hash, wraps face keys with VEIL_VAULT_KEY, uploads with cleanup on failure, writes rows in one RPC, returns an HMAC stamp; `GET /api/clips` lists uploads newest first; 29 tests incl. valid, invalid, oversized (916231f)
- B3 fix: stamp now signs the server's `stampedAt` too; request bodies are read as a stream and cut off past the limit; malformed Content-Length rejected; 5 tests (1a9711b)
