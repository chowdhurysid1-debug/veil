# Build plan: three parallel tabs

Read `SPEC.md` first. This file says who builds what, which files each tab owns, and the order of milestones. It is the plan approval that `CLAUDE.md` requires: once approved, each tab works through its milestones without asking again, except for the human decisions listed at the bottom.

## How the tabs work together

| Tab                           | Branch / worktree | Owns these files (only this tab edits them)                                                                                  |
| ----------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Integrator (the original tab) | `main`            | `lib/contracts.ts`, `SPEC.md`, `docs/`, merges                                                                               |
| A: Pipeline                   | `feat/pipeline`   | `lib/video/**`, `lib/crypto/**`, `components/pipeline/**`                                                                    |
| B: Backend + learning         | `feat/backend`    | `app/api/**`, `lib/server/**`, `lib/learning/**`, `supabase/**`, `evals/**`, `scripts/**`, `lib/ai.ts`, `lib/fallbacks.ts`   |
| C: Product UI                 | `feat/ui`         | `app/(app)/**`, `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/veil/**`, `components/ui/**`, `lib/mock.ts` |

Rules for every tab:

1. `lib/contracts.ts` is the single source of truth for every shape that crosses a boundary (pipeline output, API request and response bodies). Import from it; never redefine a shape locally. Need a change? Write it in `docs/progress/<tab>.md` under "Contract requests" and tell the user; the integrator makes the change on `main` and the other tabs rebase.
2. Never edit a file another tab owns.
3. After each milestone: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` all pass, then commit (stage by filename) and push the branch. Append one line to `docs/progress/<tab>.md`.
4. Continue straight to the next milestone. Stop only for a human decision listed at the bottom, or a failing check you cannot fix after two real attempts.
5. Never print, log, or commit secrets. Never install a package not approved below.
6. Every AI call goes through Zod and returns the fallback on failure (see `CLAUDE.md`).

## Data flow

```
video file
  -> [A] extract frames (1 fps, max 20, 640px wide) in the browser
  -> [A] detect faces (MediaPipe) -> blur on canvas
  -> [A] crop each face -> AES-GCM encrypt in browser (Web Crypto) -> ciphertext + key
  -> [A] SHA-256 of original file + each blurred frame
  => ProcessedClip (lib/contracts.ts)
  -> [B] POST /api/clips        store blurred frames, ciphertexts, wrapped keys; HMAC-sign {sha256, capturedAt}
  -> [B] POST /api/clips/:id/analyze   Claude vision on BLURRED frames + few-shot from feedback -> events
  -> [C] timeline + review buttons
  -> [B] POST /api/events/:id/feedback  real | false_alarm  -> learning stats update
  -> [B] POST /api/faces/:id/unlock     reason required -> audit row -> returns key -> [A] decrypts in browser
  -> [B] POST /api/clips/:id/verify     re-hash uploaded file, check HMAC -> intact | tampered
```

## Proposed database (needs your approval before Tab B runs it)

All tables have RLS enabled with no anon policies. Only server routes, using a server-only secret key, read or write them.

| Table          | Columns                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `sites`        | id uuid pk, name text, kind text check (school, store, hospital), created_at                                                              |
| `clips`        | id, site_id fk, filename, sha256, signature, captured_at, frame_count int, created_at                                                     |
| `frames`       | id, clip_id fk, frame_index int, t_seconds numeric, blurred_path text, sha256                                                             |
| `events`       | id, clip_id fk, frame_id fk, type text check (fall, fight, theft, fire, other), confidence numeric, description, flagged bool, created_at |
| `feedback`     | id, event_id fk unique, site_id fk, label text check (real, false_alarm), note text, created_at                                           |
| `face_vault`   | id, clip_id fk, frame_id fk, encrypted_path text, wrapped_key text, iv text, bbox jsonb, created_at                                       |
| `unlock_audit` | id, face_id fk, actor text, reason_category text, reason text, created_at                                                                 |

Storage: two private buckets, `frames` (blurred JPEGs) and `vault` (encrypted face blobs), read through short-lived signed URLs.

## Tab A: Pipeline (browser video processing)

| #   | Milestone                                                                                                             | Done when                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A1  | Frame extraction: `<video>` + canvas, 1 fps, max 20 frames at 640px wide (keeps the upload under Vercel's request limit), JPEG blobs                                                | Vitest unit test for the sampling math; manual check on a 30 s clip                       |
| A2  | Face detection with `@mediapipe/tasks-vision` (model loaded once, cached)                                             | Returns bounding boxes per frame; fallback to "no faces found" if the model fails to load |
| A3  | Blur: Gaussian blur over each box with 20% padding, applied to every frame before anything leaves the browser         | Visual check; test that output frame differs only inside boxes                            |
| A4  | Face vault crypto: crop each face, AES-GCM 256 with a fresh key per face, export raw key                              | Round-trip test: encrypt then decrypt returns identical bytes                             |
| A5  | Hashing: SHA-256 of the original file and of each blurred frame (Web Crypto)                                          | Test against a known vector                                                               |
| A6  | `processClip(file, onProgress)` returning `ProcessedClip`, with progress events for the UI                            | Integration test on a fixture; under 15 s for a 30 s 720p clip on a laptop                |
| A7  | `decryptFace(ciphertext, key, iv)` for the unlock flow                                                                | Test                                                                                      |
| A8  | Hardening: huge files rejected with a friendly message, odd codecs, zero-face clips, memory released after processing | Tests for each case                                                                       |

## Tab B: Backend + learning

| #   | Milestone                                                                                                                                                                                              | Done when                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| B1  | Migrations in `supabase/migrations/` matching the approved schema, plus seed: 2 sites and about 20 labeled feedback rows marked as seed data                                                           | Applied to the Supabase project; seed script idempotent                     |
| B2  | Server Supabase client using the server-only key; storage helpers for signed URLs                                                                                                                      | Unit-tested helpers                                                         |
| B3  | `POST /api/clips`: validate with contracts, store frames + vault rows, HMAC-sign `{clipId, sha256, capturedAt}`                                                                                        | Tests for valid, invalid, oversized                                         |
| B4  | `POST /api/clips/:id/analyze`: Claude vision on blurred frames, Zod-parsed, fallback on failure, daily cap applies                                                                                     | Mocked-model tests for valid, malformed, timeout                            |
| B5  | Learning: `lib/learning/` retrieves few-shot examples by event type across all sites and computes per-type thresholds from false-alarm rates; events below threshold are stored with `flagged = false` | Tests: adding false-alarm labels raises the threshold; real labels lower it |
| B6  | `POST /api/events/:id/feedback` and `GET /api/learning/stats` (labels count, sites count, per-type false-alarm rate, threshold, last 10 labels)                                                        | Tests                                                                       |
| B7  | `POST /api/faces/:id/unlock`: reason category + reason text (min 15 chars) required, audit row written first, then key returned. `GET /api/audit`                                                      | Test that no key is returned without an audit row                           |
| B8  | `POST /api/clips/:id/verify`: re-hash, compare, check HMAC                                                                                                                                             | Tests for intact and one-byte-changed                                       |
| B9  | Evals: `evals/demo-inputs.json` extended with frame-description cases for each event type, including the shoe-tying false alarm; `npm run evals` reports precision per type                            | Evals pass, and results are written in `docs/progress/backend.md`           |

## Tab C: Product UI

Follow the global design rules: dark zinc base, one indigo accent, Inter, Lucide icons, shadcn components, scroll-aware navbar, loading skeletons, friendly empty and error states. Build against `lib/mock.ts` (shapes from `lib/contracts.ts`) until Tab B's routes are merged, so nothing waits.

| #   | Milestone                                                                                                                                       | Done when                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| C1  | App shell: sidebar (Clips, Learning, Audit log, Verify), demo identity badge, layout                                                            | Renders, keyboard navigable            |
| C2  | Upload screen: drop zone, per-step progress (frames, faces, encrypting, stamping, analyzing), "N faces locked, 0 stored in the clear" counter   | Works with mock pipeline progress      |
| C3  | Clip view: blurred frame scrubber, event timeline with markers, event cards with confidence                                                     | Mock data                              |
| C4  | Review: Real / False alarm buttons with optimistic update and an undo toast                                                                     | Mock data                              |
| C5  | Learning panel: labels across sites, per-type threshold bars, false-alarm rate over time chart, "learned from 1 new label" pulse after feedback | Mock data, animated with framer-motion |
| C6  | Unlock dialog: reason category select + reason textarea, warning copy, then decrypted face shown for 30 s; audit log page                       | Mock data                              |
| C7  | Verify page: drop the original file, big "Intact" or "Tampered" result with the stamp time                                                      | Mock data                              |
| C8  | Landing page: problem, sourced stats from SPEC.md with links, how it works, the "forgets faces" line, CTA into the demo                         | Every number links to its source       |
| C9  | Swap mocks for real API calls as Tab B merges, one screen at a time                                                                             | Each screen works end to end           |

## Integrator (original tab)

1. Write `lib/contracts.ts` and `lib/mock.ts` stubs, commit to `main`, before the three tabs start.
2. Merge `feat/pipeline`, `feat/backend`, `feat/ui` into `main` at each milestone checkpoint, resolving conflicts by reading both sides.
3. Keep `docs/DEMO.md`: the exact 90-second demo script and the clips it uses.
4. Final pass: full checks, evals, end-to-end run of the demo path, deploy only when the user says so.

## Human decisions (stop and ask the user)

- Supabase project: not set up yet (2026-10-16). Tab B builds B2 to B9 against mocked clients first and runs B1 only after the user confirms the keys are in `.env.local`. Migrations are applied by pasting the SQL into the Supabase dashboard SQL editor; do not install the Supabase CLI without asking.

- ~~Approve the database schema~~ Approved 2026-10-16.
- ~~Approve the packages~~ Approved and installed 2026-10-16: `@mediapipe/tasks-vision@1.1.0`, `framer-motion@14.0.0`.
- Add to `.env.local` yourself: `SUPABASE_SECRET_KEY`, `VEIL_SIGNING_SECRET`, `VEIL_VAULT_KEY` (any long random strings for the last two).
- Pick the demo clips. Use clips you have rights to, or record your own with your team as actors. No real students.
- Any change to the demo path in `SPEC.md`.
