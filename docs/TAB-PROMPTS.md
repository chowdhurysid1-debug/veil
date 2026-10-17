# Starting the three worker tabs

Open three terminal tabs in `/Users/sidchowdhury/Documents/hackathon-template`. In each tab, run the command, then paste the prompt as the first message.

Each tab gets its own git worktree (a separate copy of the repo on its own branch), so they never overwrite each other. After the session opens, copy your env file in: `cp /Users/sidchowdhury/Documents/hackathon-template/.env.local .` and run `npm install`.

## Tab A: Pipeline

```bash
claude -w pipeline
```

```
You are Tab A (Pipeline) for the Veil hackathon project. Read CLAUDE.md, SPEC.md, docs/PLAN.md and lib/contracts.ts before anything else. The plan in docs/PLAN.md is already approved by the user, so do not ask for plan approval again.

Work on branch feat/pipeline (rename this worktree's branch to it first). You own only lib/video/**, lib/crypto/**, components/pipeline/**. Never edit files outside that list. If you need a contract change, write it under "Contract requests" in docs/progress/pipeline.md and tell me.

Work through milestones A1 to A8 in order. For each milestone: write the test first where the plan says so, implement, then run npx tsc --noEmit, npm run lint, npm test and npm run build. When all pass, commit by filename with a conventional message, push the branch, and add one line to docs/progress/pipeline.md. Then go straight to the next milestone without waiting for me.

Use @mediapipe/tasks-vision 1.1.0 (already installed) and Web Crypto. No other packages. Faces must be blurred and encrypted before anything leaves the browser. Stop only for a human decision listed in docs/PLAN.md or a check you cannot fix after two real attempts.
```

## Tab B: Backend + learning

```bash
claude -w backend
```

```
You are Tab B (Backend + learning) for the Veil hackathon project. Read CLAUDE.md, SPEC.md, docs/PLAN.md and lib/contracts.ts before anything else. The plan and the database schema in docs/PLAN.md are already approved by the user.

Work on branch feat/backend (rename this worktree's branch to it first). You own only app/api/**, lib/server/**, lib/learning/**, supabase/**, evals/**, scripts/**, lib/ai.ts and lib/fallbacks.ts. Never edit files outside that list. Contract changes go under "Contract requests" in docs/progress/backend.md.

The Supabase project is not set up yet. Start with B2 to B9 using mocked Supabase clients in tests, and write the B1 migration SQL in supabase/migrations/. Run B1 against the real project only after I tell you the keys are in .env.local. Apply migrations by giving me the SQL to paste into the Supabase SQL editor; do not install the Supabase CLI.

For each milestone: tests first for fragile logic (AI parsing, learning thresholds, unlock audit, verify), implement, run npx tsc --noEmit, npm run lint, npm test, npm run build, and npm run evals after any prompt change. When all pass, commit by filename, push, add one line to docs/progress/backend.md, and continue to the next milestone without waiting for me.

Every model call: Zod-validated against lib/contracts.ts, fallback on failure, max output tokens set, daily cap applied. The model only ever receives blurred frames. Never log keys, face data or secrets. No new packages.
```

## Tab C: Product UI

```bash
claude -w ui
```

```
You are Tab C (Product UI) for the Veil hackathon project. Read CLAUDE.md, SPEC.md, docs/PLAN.md and lib/contracts.ts before anything else. The plan is already approved by the user.

Work on branch feat/ui (rename this worktree's branch to it first). You own only app/(app)/**, app/page.tsx, app/layout.tsx, app/globals.css, components/veil/**, components/ui/** and lib/mock.ts. Never edit files outside that list. Contract changes go under "Contract requests" in docs/progress/ui.md.

Build every screen against lib/mock.ts first so you never wait on the backend. Follow the global design rules in ~/.claude/CLAUDE.md: dark zinc base, one indigo accent, Inter, Lucide icons, shadcn components, scroll-aware navbar on the landing page, skeleton loaders, friendly empty and error states, no emojis, no em dashes. framer-motion 14.0.0 is installed for the learning panel animations.

Work through milestones C1 to C8 in order (C9 waits until backend routes are merged to main). For each: build it, check it in the browser at desktop and 375px width, run npx tsc --noEmit, npm run lint, npm test, npm run build, then commit by filename, push, add one line to docs/progress/ui.md, and continue to the next milestone without waiting for me. Every statistic on the landing page must link to the source listed in SPEC.md.
```

## Merging

Tell the original tab (the coordinator) "merge" whenever a tab finishes a milestone. It merges `feat/pipeline`, `feat/backend` and `feat/ui` into `main` and tells the other tabs to pull.
