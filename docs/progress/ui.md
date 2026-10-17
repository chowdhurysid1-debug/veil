# Progress: ui

One line per finished milestone: id, what shipped, commit hash.

- C1: app shell (sidebar, mobile nav, skip link, demo identity), clips list on the mock backend, zinc + indigo theme, Inter. f42afba
- C2: upload screen at /clips/new: drop zone, five-step progress, faces-locked counter, result with blurred filmstrip; mock pipeline hashes the real file. 2db58c6
- C3: clip view at /clips/[id]: blurred frame player with face-lock boxes, keyboard timeline with event markers, filmstrip, event cards with confidence vs learned threshold. 73e645e
- Merged main (pipeline A1 to A8). Upload screen now runs `processClip` from `@/lib/video`; deleted the UI's duplicate mock pipeline and hash helper. `PipelineError` messages are shown to the officer as-is. 2e4e777
- C4: Real / False alarm review with optimistic label, 5 s undo toast (request sent only when the toast closes), success toast "Learned from N new labels across M sites" with the new threshold. 302e373

## Contract requests

1. **Routes the UI reads that the plan does not list (Tab B).** `lib/contracts.ts` already has the shapes; the routes are missing from `docs/PLAN.md`:
   - `GET /api/clips` returning `ClipSummary[]` (newest first) for the Clips screen.
   - `GET /api/clips/:id` returning `ClipDetail` for the clip view.
2. **Site id for uploads.** The upload screen posts `siteId = MOCK_SITES[0].id` (`3f2b8c1e-5d4a-4b7e-9c1f-2a6d8e0b4c71`, Demo High School). Please seed Demo High School with that id, or add `GET /api/sites` so the UI can look it up.
3. **Analysis status on `ClipDetail` (integrator, optional).** `ClipDetail` cannot tell "no events" apart from "analysis failed". Proposed: `analysisStatus: z.enum(["complete", "unavailable"])` on `clipDetailSchema`, so the clip view can show "Analysis unavailable, review manually" after a reload, not only right after upload.
4. ~~Pipeline progress semantics (Tab A).~~ Resolved: Tab A's `processClip` reports progress within each step, which is how the upload screen reads it.
