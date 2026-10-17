# Progress: ui

One line per finished milestone: id, what shipped, commit hash.

- C1: app shell (sidebar, mobile nav, skip link, demo identity), clips list on the mock backend, zinc + indigo theme, Inter. f42afba
- C2: upload screen at /clips/new: drop zone, five-step progress, faces-locked counter, result with blurred filmstrip; mock pipeline hashes the real file. 2db58c6
- C3: clip view at /clips/[id]: blurred frame player with face-lock boxes, keyboard timeline with event markers, filmstrip, event cards with confidence vs learned threshold. 73e645e
- Merged main (pipeline A1 to A8). Upload screen now runs `processClip` from `@/lib/video`; deleted the UI's duplicate mock pipeline and hash helper. `PipelineError` messages are shown to the officer as-is. 2e4e777
- C4: Real / False alarm review with optimistic label, 5 s undo toast (request sent only when the toast closes), success toast "Learned from N new labels across M sites" with the new threshold. 302e373
- C5: /learning dashboard (label totals, false-alarm trend chart with hover and table view, per-type threshold meters, recent labels) plus a shared-learning card on the clip view that pulses "Learned from 1 new label across 2 sites" after a label saves. 7f6a7e7
- C6: unlock dialog (reason category + 15-char written reason, warning copy, audit-first), face decrypted in the browser with `decryptFace` and shown for 30 s then re-locked; locked-faces list and clickable face boxes on the clip view; /audit timeline. df381a2
- C7: /verify: pick a stamped clip (or arrive from the clip page), drop the file, hash it in the browser with `sha256File`, big Intact / Tampered verdict with the stamp time and both hash prefixes. 7c787c5
- C8: landing page at / (replaces the template summarize demo): hero with a product mockup, the three SPEC.md figures each linked to its source, the "forgets faces" line, five-step how it works, CTA into /clips/new, footer with sources; scroll-aware nav. 584718b
- C9 (clips): merged main (backend B1 to B9). `httpBackend` fetches every Tab B route and parses each response with `lib/contracts.ts`; server `{ error }` sentences are shown as-is, anything else gets the generic message. Clips list, upload (posts `DEMO_SITE_ID`), and clip view now run on the real API; checked end to end with a real upload (17 faces locked, signed frame URLs render). 79da413
- C9 (review + learning): Real / False alarm labels post to `/api/events/:id/feedback` after the undo window, and the clip view's learning card and /learning read `/api/learning/stats`. Copy now says the trend is a running rate, matching the backend's cumulative `history`. Checked with a synthetic trash-can fire clip labeled Real (fire threshold 0.47 to 0.46; no fall labels added). a36fe2b

## Contract requests

1. ~~Routes the UI reads that the plan does not list (Tab B).~~ Handled on `feat/backend` (B3, B4), not yet on main. `lib/contracts.ts` already has the shapes; the routes are missing from `docs/PLAN.md`:
   - `GET /api/clips` returning `ClipSummary[]` (newest first) for the Clips screen.
   - `GET /api/clips/:id` returning `ClipDetail` for the clip view.
2. ~~Site id for uploads.~~ Handled: `lib/learning/seed.ts` seeds Demo High School with the same id. The upload screen posts `siteId = MOCK_SITES[0].id` (`3f2b8c1e-5d4a-4b7e-9c1f-2a6d8e0b4c71`, Demo High School). Please seed Demo High School with that id, or add `GET /api/sites` so the UI can look it up.
3. **Analysis status on `ClipDetail` (integrator, optional).** `ClipDetail` cannot tell "no events" apart from "analysis failed". Proposed: `analysisStatus: z.enum(["complete", "unavailable"])` on `clipDetailSchema`, so the clip view can show "Analysis unavailable, review manually" after a reload, not only right after upload.
4. ~~Pipeline progress semantics (Tab A).~~ Resolved: Tab A's `processClip` reports progress within each step, which is how the upload screen reads it.
5. ~~Vault object format (Tab B).~~ Handled: B3 stores decoded ciphertext bytes. The UI fetches `UnlockResponse.ciphertextUrl` and base64-encodes the response body before calling `decryptFace(ciphertextBase64, rawKeyBase64, ivBase64)`. So the vault object behind that URL must be the raw ciphertext bytes (base64-decoded `LockedFace.ciphertextBase64`), not base64 text.
