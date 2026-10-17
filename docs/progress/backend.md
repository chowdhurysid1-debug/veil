# Progress: backend

One line per finished milestone: id, what shipped, commit hash.

## API for Tab C (C9)

Every body and response matches `lib/contracts.ts`. Every error is `{ error }` with a sentence safe to show. Responses send `Cache-Control: no-store`. Until Supabase is configured, every route answers 503 with a friendly error.

| Route                           | Body                                                                             | Returns                                                                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/clips`               | `CreateClipRequest` (`processClip` output plus `siteId`: use `MOCK_SITES[0].id`) | 201 `CreateClipResponse`; 400 bad upload, 404 unknown site, 413 over 4.4 MB                                                                                                                        |
| `GET /api/clips`                | none                                                                             | `ClipSummary[]`, newest first, seed clips hidden                                                                                                                                                   |
| `GET /api/clips/:id`            | none                                                                             | `ClipDetail`; frame URLs expire in 10 minutes                                                                                                                                                      |
| `POST /api/clips/:id/analyze`   | none                                                                             | `AnalyzeResponse`; `isFallback: true` with no events means "Analysis unavailable, review manually". Safe to call twice: it returns the stored result                                               |
| `POST /api/events/:id/feedback` | `FeedbackRequest`                                                                | `FeedbackResponse` with fresh stats. No delete: for undo, delay the POST until the toast closes, or send the other label                                                                           |
| `GET /api/learning/stats`       | none                                                                             | `LearningStats` (all five types; `history` is cumulative)                                                                                                                                          |
| `POST /api/faces/:id/unlock`    | `UnlockRequest`                                                                  | `UnlockResponse`; 400 carries the "at least 15 characters" message. Fetch `ciphertextUrl` within 30 s, base64 the bytes, then call Tab A's `decryptFace(ciphertextBase64, rawKeyBase64, ivBase64)` |
| `GET /api/audit`                | none                                                                             | `AuditEntry[]`, newest first                                                                                                                                                                       |
| `POST /api/clips/:id/verify`    | `VerifyRequest` (`sha256File(file)` from `lib/crypto/hash`)                      | `VerifyResponse`                                                                                                                                                                                   |

## Contract requests

1. Add `DEMO_SITE_ID = "3f2b8c1e-5d4a-4b7e-9c1f-2a6d8e0b4c71"` next to `DEMO_IDENTITY` in `lib/contracts.ts`. `POST /api/clips` needs a `siteId`, and the seed creates Demo High School with exactly this id (the same id `MOCK_SITES[0]` uses), so the UI can send it without a sites endpoint.

## Schema requests (need your approval)

1. Add `analyzed_at timestamptz` to `clips`, claimed with `update clips set analyzed_at = now() where id = $1 and analyzed_at is null` before the model call. Today a repeat analyze returns stored events, and concurrent calls on one server instance share a single model call, but a clip where the model found nothing can be re-analyzed (each attempt spends one of the 100 daily cap slots), and two instances could still race. Not needed for the demo path.

## Known risks

- No authentication on any route, by design: the SPEC scopes out real login and uses one hardcoded demo identity. Anyone with the deployed URL can upload clips and unlock faces (each unlock is still written to the audit log first). Before sharing a public URL, turn on Vercel Deployment Protection or add Supabase auth.
- The original video never reaches the server, so `originalSha256` is computed in the browser. The HMAC stamp pins that hash to the server's own `stampedAt` time; it cannot prove the browser hashed the true original.
- Demo step 2 has the thinnest margin: the first shoe-tying clip scored 0.70 and then 0.65 against a 0.58 threshold in two eval runs. If the real clip lands under 0.58 it will not be flagged. Pick a clip where the person drops to the floor abruptly, and dry-run it before the demo.
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
- B7: `POST /api/faces/:id/unlock` requires a reason category and a reason of 15+ characters, writes the audit row (actor = demo identity) before unwrapping the key, and returns the key, IV, and a 30 s signed link to the ciphertext; if the audit write fails, no key leaves the server; `GET /api/audit` lists the newest 50 unlocks with their clip; 11 tests (9f3b3b5)
- B8: `POST /api/clips/:id/verify` takes the browser-computed SHA-256 and answers `intact` only if it matches the stamped hash and the stamp's HMAC still checks out, so a one-byte edit, a rewritten stored hash, or a moved stamp time all read `tampered`; returns `stampedAt` and a 12-character hash prefix for the "stamp from 21:04" line; 6 tests (ecc27ed)
- B9: `npm run evals` adds 11 analyze cases (frame-by-frame text descriptions, one per event type plus look-alikes and the three demo clips), run through the same analyzer, thresholds, and few-shot selection as the app, starting from the seed labels. `truth` drives precision; `expectFlagged` drives pass or fail. Results below (dc00369)

## Eval results (2026-10-16, claude-sonnet-5-5, two runs)

All 17 cases passed on both runs (6 summarize, 11 analyze). Event confidence / learned threshold, run 1 then run 2:

| Case                         | Truth | Flagged                | Run 1             | Run 2             |
| ---------------------------- | ----- | ---------------------- | ----------------- | ----------------- |
| demo-1-shoe-tie-first-time   | none  | fall (demo needs this) | fall 0.70 / 0.58  | fall 0.65 / 0.58  |
| demo-2-shoe-tie-after-label  | none  | none                   | fall 0.20 / 0.60  | fall 0.20 / 0.60  |
| demo-3-real-fall-after-label | fall  | fall                   | fall 0.93 / 0.60  | fall 0.93 / 0.60  |
| fall-slip-wet-floor          | fall  | fall                   | fall 0.92 / 0.58  | fall 0.92 / 0.58  |
| fall-sits-against-wall       | none  | none                   | no event          | no event          |
| fight-shoving-punches        | fight | fight                  | fight 0.93 / 0.50 | fight 0.93 / 0.50 |
| fight-play-wrestle           | none  | none                   | no event          | no event          |
| theft-concealment            | theft | theft                  | theft 0.85 / 0.51 | theft 0.85 / 0.51 |
| fire-trash-can               | fire  | fire                   | fire 0.97 / 0.47  | fire 0.97 / 0.47  |
| other-climbs-railing         | other | other                  | other 0.90 / 0.50 | other 0.85 / 0.50 |
| quiet-hallway                | none  | none                   | no event          | no event          |

Per-type precision against truth (same both runs): fall 0.67 (2 of 3; the one false positive is the demo's intentional first shoe-tie alert), fight 1.00, theft 1.00, fire 1.00, other 1.00. Recall 1.00 for every type. These are 11 hand-written text cases, not a benchmark: they show the demo path works in text form, not how the model does on real video.
