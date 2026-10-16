# Hackathon template

Next.js App Router starter for shipping one demo path fast. It includes a Zod-validated AI route that falls back to friendly copy whenever the model call or parsing fails.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind 4, shadcn/ui
- Vercel AI SDK 7 with Anthropic. The model is pinned in `lib/ai.ts`.
- Zod for every input and model output
- Supabase clients in `lib/supabase/`. There's no schema yet.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev
```

## Where things live

| File                        | Purpose                              |
| --------------------------- | ------------------------------------ |
| `SPEC.md`                   | The one demo path. Fill it in first. |
| `lib/ai.ts`                 | Pinned model ID, token cap, timeout  |
| `lib/schemas.ts`            | Input and output Zod schemas         |
| `lib/fallbacks.ts`          | Fallback content and `withFallback`  |
| `lib/generate.ts`           | Model call with structured output    |
| `app/api/generate/route.ts` | Sample POST route                    |
| `evals/demo-inputs.json`    | Demo inputs for `npm run evals`      |

## Sample route

```bash
curl -X POST localhost:3000/api/generate \
  -H 'content-type: application/json' \
  -d '{"text":"We cut checkout from five steps to two."}'
```

The route has three possible results:

- **Success:** returns `{ data: { title, summary, tags }, isFallback: false }`.
- **Bad input:** returns a 400 with a readable `error`.
- **Model or parse failure:** returns the fallback with `isFallback: true`.

## Commands

| Command         | What it does                                                     |
| --------------- | ---------------------------------------------------------------- |
| `npm run dev`   | Local server                                                     |
| `npm test`      | Parsing and fallback tests (vitest, model mocked)                |
| `npm run evals` | Runs demo inputs against the real model. Exits 1 on any failure. |
| `npm run build` | Run this before deploying                                        |

Built with Chewbacca
