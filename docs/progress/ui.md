# Progress: ui

One line per finished milestone: id, what shipped, commit hash.

- C1: app shell (sidebar, mobile nav, skip link, demo identity), clips list on the mock backend, zinc + indigo theme, Inter. Commit: see `git log --grep "C1"`.

## Contract requests

1. **Routes the UI reads that the plan does not list (Tab B).** `lib/contracts.ts` already has the shapes; the routes are missing from `docs/PLAN.md`:
   - `GET /api/clips` returning `ClipSummary[]` (newest first) for the Clips screen.
   - `GET /api/clips/:id` returning `ClipDetail` for the clip view.
2. **Site id for uploads.** The upload screen posts `siteId = MOCK_SITES[0].id` (`3f2b8c1e-5d4a-4b7e-9c1f-2a6d8e0b4c71`, Demo High School). Please seed Demo High School with that id, or add `GET /api/sites` so the UI can look it up.
3. **Analysis status on `ClipDetail` (integrator, optional).** `ClipDetail` cannot tell "no events" apart from "analysis failed". Proposed: `analysisStatus: z.enum(["complete", "unavailable"])` on `clipDetailSchema`, so the clip view can show "Analysis unavailable, review manually" after a reload, not only right after upload.
