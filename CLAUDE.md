# CLAUDE.md: Hackathon Rules

## Goal
Ship a working, deployed demo of ONE happy path. Judges score the demo and the story, not the architecture. Hardcode anything not on the demo path.

## Stack (do not change without asking)
- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase for database, auth, storage
- Vercel for deploys
- Vercel AI SDK for model calls; Zod for all schemas
- Model: use the exact pinned model string in `lib/ai.ts`. Never use "latest".

## Workflow
1. Read `SPEC.md` before any task. If it's missing or unclear, ask.
2. Propose a step-by-step plan first. Write no code until I approve it.
3. One small, focused change per task. "Build billing" is too big; "add a usage counter" is right.
4. Write or update a test for fragile logic (AI output parsing, core logic) before the code.
5. After each working step, tell me to commit. Never batch large changes.

## AI feature rules
- Validate user input before calling the model.
- Every model response is parsed against a Zod schema.
- If parsing fails or the call errors, return the fallback from `lib/fallbacks.ts`. The UI must never show a raw error.
- Keep prompts short and outputs bounded (set max tokens).
- After any prompt change, run `npm run evals` and report results.

## Security rules
- Secrets live only in `.env.local` and Vercel env vars. Never print, log, or hardcode keys.
- Never install a package without telling me its name and weekly downloads first. Do not invent packages.
- Never build custom auth. Use Supabase auth.
- If the app reads untrusted content (emails, web pages), it must NOT also send messages or take external actions without a user click to approve.

## Humans decide
- Architecture changes
- Database schema changes and migrations
- Anything touching money or real user data
- What goes into the final demo

## Don't
- Don't refactor working code during the hackathon.
- Don't add features outside SPEC.md.
- Don't dump the whole repo into context; read only the files the task needs.

## Commands
- `npm run dev`: local server
- `npm run evals`: run demo inputs in `evals/demo-inputs.json`
- `npm run build`: check before deploying
