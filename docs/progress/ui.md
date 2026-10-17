# Progress: ui

One line per finished milestone: id, what shipped, commit hash.

- C1: app shell (sidebar, mobile nav, skip link, demo identity), clips list on the mock backend, zinc + indigo theme, Inter. f42afba
- C2: upload screen at /clips/new: drop zone, five-step progress, faces-locked counter, result with blurred filmstrip; mock pipeline hashes the real file. 2db58c6
- C3: clip view at /clips/[id]: blurred frame player with face-lock boxes, keyboard timeline with event markers, filmstrip, event cards with confidence vs learned threshold. 73e645e

## Contract requests

1. **Routes the UI reads that the plan does not list (Tab B).** `lib/contracts.ts` already has the shapes; the routes are missing from `docs/PLAN.md`:
   - `GET /api/clips` returning `ClipSummary[]` (newest first) for the Clips screen.
   - `GET /api/clips/:id` returning `ClipDetail` for the clip view.
2. **Site id for uploads.** The upload screen posts `siteId = MOCK_SITES[0].id` (`3f2b8c1e-5d4a-4b7e-9c1f-2a6d8e0b4c71`, Demo High School). Please seed Demo High School with that id, or add `GET /api/sites` so the UI can look it up.
3. **Analysis status on `ClipDetail` (integrator, optional).** `ClipDetail` cannot tell "no events" apart from "analysis failed". Proposed: `analysisStatus: z.enum(["complete", "unavailable"])` on `clipDetailSchema`, so the clip view can show "Analysis unavailable, review manually" after a reload, not only right after upload.
4. **Pipeline progress semantics (Tab A).** The upload screen reads `PipelineProgress.progress` as progress *within* the current step (0..1 per step), and maps steps `frames` -> 1, `faces`/`blur` -> 2, `encrypt` -> 3, `hash`/`done` -> 4 of its five rows. If `processClip` reports overall progress instead, tell Tab C.
