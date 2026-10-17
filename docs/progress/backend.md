# Progress: backend

One line per finished milestone: id, what shipped, commit hash.

## Contract requests

1. Add `DEMO_SITE_ID = "3f2b8c1e-5d4a-4b7e-9c1f-2a6d8e0b4c71"` next to `DEMO_IDENTITY` in `lib/contracts.ts`. `POST /api/clips` needs a `siteId`, and the seed creates Demo High School with exactly this id (the same id `MOCK_SITES[0]` uses), so the UI can send it without a sites endpoint.

## Schema requests (need your approval)

1. Add `analyzed_at timestamptz` to `clips`, claimed with `update clips set analyzed_at = now() where id = $1 and analyzed_at is null` before the model call. Today a repeat analyze returns stored events, and concurrent calls on one server instance share a single model call, but a clip where the model found nothing can be re-analyzed (each attempt spends one of the 100 daily cap slots), and two instances could still race. Not needed for the demo path.

## Known risks

- No authentication on any route, by design: the SPEC scopes out real login and uses one hardcoded demo identity. Anyone with the deployed URL can upload clips and unlock faces (each unlock is still written to the audit log first). Before sharing a public URL, turn on Vercel Deployment Protection or add Supabase auth.
- The original video never reaches the server, so `originalSha256` is computed in the browser. The HMAC stamp pins that hash to the server's own `stampedAt` time; it cannot prove the browser hashed the true original.
- Learning is pooled across sites, as the SPEC promises, so one site that marks many false alarms raises the threshold for every site, fire included. Product call for later: cap how far other sites can move a threshold, or give fire a lower ceiling. The model prompt carries other sites' event descriptions and officer notes (fenced as data, 200 characters max) but never their site names.

## Milestones

- B1: migration (7 tables, RLS on with no policies, atomic `create_clip` RPC, append-only audit log, private `frames` and `vault` buckets) and idempotent seed (2 sites, 20 labeled seed events) generated from `lib/learning/seed.ts`. Written, not applied: waiting for Supabase keys (1a58b76)
- B2: server-only Supabase client on the secret key, env validation that names missing vars and never echoes values, strict base64 and JPEG checks, storage paths, signed URLs in request order, bounded-concurrency uploads, 17 tests (02b13f3)
- B3: `POST /api/clips` validates the contract, checks each frame is a JPEG matching its hash, wraps face keys with VEIL_VAULT_KEY, uploads with cleanup on failure, writes rows in one RPC, returns an HMAC stamp; `GET /api/clips` lists uploads newest first; 29 tests incl. valid, invalid, oversized (916231f)
- B3 fix: stamp now signs the server's `stampedAt` too; request bodies are read as a stream and cut off past the limit; malformed Content-Length rejected; 5 tests (1a9711b)
- B4: `POST /api/clips/:id/analyze` sends only blurred frames to claude-sonnet-5-5 (max 1200 output tokens, 45 s timeout), parses with `analyzeOutputSchema`, drops events on frames never sent, falls back on model, parse, frame-load, or daily-cap (100/day) failure, and returns stored events on repeat calls; `GET /api/clips/:id` returns signed frame URLs, events, face boxes, no key material; 21 tests plus one real image call that parsed cleanly (a6c0442)
- B5: per-type threshold = 0.4 + 0.5 x smoothed false-alarm rate, prior 1 false alarm in 5 labels (seed gives fall 0.58, fight 0.50, theft 0.51, fire 0.47; the demo's shoe-tying false alarm moves fall to 0.60); few-shot sends the newest 3 false alarms and 2 real labels per type from every site; every event is stored, `flagged` only at or above its type's threshold; concurrent analyze calls share one model call; 16 tests (74a80de)
- B5 fix: few-shot examples no longer carry site names (232501f)
- B6: `POST /api/events/:id/feedback` (label `real` or `false_alarm`, optional note; labeling again replaces the label, so undo = send the other label) returns the updated `LearningStats`; `GET /api/learning/stats` returns totals, all five types with raw false-alarm rate and threshold, newest 10 labels, and `history` as the cumulative false-alarm rate per UTC day (one new label nudges the line rather than spiking a day); includes a test of demo steps 1 to 4 through the real handlers; 16 tests (1810231)
