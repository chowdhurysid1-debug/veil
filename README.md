# Veil

**Security cameras that forget faces unless there is a reason to remember.**

Veil blurs and encrypts every face in the browser before footage leaves the device. An AI reviews only the blurred frames and flags fights, falls, thefts, and camera tampering. Every time an officer marks an alert real or a false alarm, Veil gets better at every site.

|                         |                                                  |
| ----------------------- | ------------------------------------------------ |
| Live app                | https://veil-iota-ten.vercel.app                 |
| Pitch deck (in the app) | https://veil-iota-ten.vercel.app/pitch           |
| Measured learning curve | https://veil-iota-ten.vercel.app/learning        |
| 2-minute video deck     | https://veil-iota-ten.vercel.app/pitch?cut=video |
| Demo video              | _link added at submission_                       |

## Team

- **Sid Chowdhury**: product, design, and build
- **Anshul Bihani**: product, design, and build

We built everything together at SEP Hacks.

## Problem

93% of US public schools run security cameras ([NCES](https://nces.ed.gov/programs/coe/indicator/a19/school-reported-safety-practices)). Every one of those cameras records every student's face, and stored face data is a liability:

- Facebook paid $650M to settle an Illinois biometric privacy case ([Orrick](https://infobytes.orrick.com/2021-03-04/court-approves-650-million-biometric-privacy-class-action-settlement/)). Meta paid Texas $1.4B ([Texas Tribune](https://www.texastribune.org/2024/07/30/texas-meta-facebook-biometric-data-settlement)).
- The EU AI Act bans building face databases from CCTV ([Orrick](https://www.orrick.com/en/Insights/2025/04/EU-Commission-Publishes-Guidelines-on-the-Prohibited-AI-Practices-under-the-AI-Act)).
- Hackers got into 150,000 Verkada cameras, including inside schools ([Axios](https://www.axios.com/2021/03/09/hackers-breach-verkada-security-cameras)).

Today's privacy tools blur faces on screen only. Verkada's Live Face Blur keeps real faces in stored footage and runs only on Verkada hardware ([Verkada](https://www.verkada.com/blog/nov-2023-product-updates/)).

## Solution

1. **Faces never leave the browser in the clear.** Each head is found with MediaPipe, blurred in every frame, and encrypted with its own AES-256 key before upload.
2. **The AI never sees a face.** Claude reads only the blurred frames and reports events with a confidence score.
3. **Unlocking a face costs something.** It needs a written reason, and the audit row is written before the key is released.
4. **Footage is stamped.** A SHA-256 hash at upload means any later edit shows up as Tampered.
5. **It learns from every officer at every site.** Labels change the alert thresholds and the examples the AI sees.

Veil works with any camera's video file. There's no new hardware.

## How AI is used

| Part                         | Model or technique                                                                                                                            | Where                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Head detection (CV)          | MediaPipe Tasks Vision 1.1.0: BlazeFace short range plus EfficientDet Lite2 person boxes, in the browser (WebAssembly)                        | [lib/video/detectFaces.ts](lib/video/detectFaces.ts)                                                         |
| Event detection (vision LLM) | Claude Sonnet 5.5 (`claude-sonnet-5-5`, pinned) through the Vercel AI SDK 7, with Zod structured output. Input: up to 20 blurred 640px frames | [lib/server/analyzeFrames.ts](lib/server/analyzeFrames.ts), [lib/ai.ts](lib/ai.ts)                           |
| Continual learning           | Per-type thresholds calibrated from each type's false-alarm rate, plus few-shot examples retrieved from every site's labels                   | [lib/learning/thresholds.ts](lib/learning/thresholds.ts), [lib/learning/fewShot.ts](lib/learning/fewShot.ts) |
| Fallback                     | If the call fails or the output doesn't parse, the clip is kept and marked "review manually". No raw error reaches the UI                     | [lib/fallbacks.ts](lib/fallbacks.ts)                                                                         |

The threshold for each event type is `0.4 + 0.5 x smoothed false-alarm rate`, with a prior of 1 false alarm in 5 labels, so a single label can't swing it to an extreme.

## How we address each track

### Continual Learning

| Criterion                      | How Veil meets it                                                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gets better with use           | Each label moves that type's threshold and is added to the examples the AI sees. Measured: on one school, false alarms fall from 5 to 1 over four weeks of labels (below).                                       |
| Learning is core               | Faces are blurred, so the AI can't read expressions and can't tell a hug from a fight on day one. Officer labels recover that accuracy. Privacy is what makes learning necessary.                                |
| Can't be done without learning | Every site's normal is different, and nobody can write down every harmless hug, game, or shoe-tie in advance. Without labels, a privacy-safe camera pages officers for every hug.                                |
| More valuable at scale         | Labels are pooled across sites, with no faces, ids, or site names in what the AI sees. Measured: a school with zero labels of its own, learning only from a store's labels, also falls from 5 false alarms to 1. |

**Measured learning curve** (`npm run evals:learning`, 3 runs on the real model):

| Week  | One school: false alarms | School taught only by a store | Real incidents caught (one school) |
| ----- | ------------------------ | ----------------------------- | ---------------------------------- |
| Day 1 | 5                        | 5                             | 8 of 8                             |
| 1     | 3                        | 4.7                           | 7.7 of 8                           |
| 2     | 1.3                      | 1.7                           | 7.7 of 8                           |
| 3     | 1                        | 2                             | 8 of 8                             |
| 4     | 1                        | 1                             | 8 of 8                             |

The test set is 16 school clips (8 harmless, 8 real incidents), written and frozen before the first run. Scenarios are written descriptions of blurred frames, not video. Every real incident that went unflagged was a model call that failed to parse, which the app shows as "review manually". Learning never hid a real incident.

When both sites' labels were pooled, false alarms rose again in week 4 (to 2.3). Our best read: the AI sees only the 3 newest false alarms per type, so newer labels pushed out the hug lesson. The fix is keeping more examples per type. Full data: [evals/results/learning-curve-summary.json](evals/results/learning-curve-summary.json).

### Scale to $1B

| Criterion    | How Veil meets it                                                                                                                                                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Large market | Video surveillance equipment and software is $35.5B this year and projected at $47.9B by 2030 ([Memoori](https://memoori.com/portfolio/global-video-surveillance-business-2025-2030/)). 93% of US public schools already run cameras.                                                                                                            |
| Path to $1B  | Schools first, then stores, then hospitals: the schema already supports all three. It's software on cameras customers already own, priced per camera per month, so revenue grows with every camera connected.                                                                                                                                    |
| Pays today   | Districts and chains already pay for camera software and carry the liability for stored faces. Every unlock and stamp is the record a parent, court, or regulator asks for. We'll set the price in a paid pilot rather than guess it.                                                                                                            |
| Why now      | Regulators moved: the FTC banned Rite Aid's face recognition ([Bloomberg Law](https://news.bloomberglaw.com/daily-labor-report/rite-aid-banned-from-ai-facial-recognition-by-ftc-after-misuse)), Texas took $1.4B, and the EU banned CCTV face databases. And vision models can now flag a fight from blurred frames without ever seeing a face. |

## Key files

If you only read a few files, read these:

1. [lib/learning/curve.ts](lib/learning/curve.ts): the learning curve experiment. An officer labels only what gets flagged, and test clips are scored week by week.
2. [lib/learning/thresholds.ts](lib/learning/thresholds.ts) and [lib/learning/fewShot.ts](lib/learning/fewShot.ts): the two learning mechanisms.
3. [lib/server/analyzeFrames.ts](lib/server/analyzeFrames.ts): the Claude call, its prompt, and the structured output.
4. [lib/video/processClip.ts](lib/video/processClip.ts): the in-browser pipeline (frames, head detection, blur, per-face encryption, hash).
5. [lib/crypto/faceVault.ts](lib/crypto/faceVault.ts): per-face AES-GCM keys.
6. [components/veil/ClipView.tsx](components/veil/ClipView.tsx) and [components/veil/WhatItLearned.tsx](components/veil/WhatItLearned.tsx): the review console and the live learning panel.
7. [lib/contracts.ts](lib/contracts.ts): every shared Zod schema.
8. [SPEC.md](SPEC.md): the demo path.

## How we built it

- **Stack:** Next.js 16 (App Router), TypeScript, Tailwind 4, shadcn/ui, framer-motion, the Vercel AI SDK 7 with Anthropic, Zod 4, Supabase (Postgres with RLS and private storage buckets), MediaPipe, mediabunny for in-browser video rendering, and Vitest. Deployed on Vercel.
- **Parallel build:** we ran several Claude Code agents in separate git worktrees (video pipeline, backend, UI, pitch), with one shared contract file so they never drifted apart.
- **Constraints we worked around:**
  - **Hidden gestures:** a high-five failed as a demo clip because the hands meet at head height, inside the blur, so the AI never saw them. We switched to hugs, which happen at body level.
  - **Parse failures:** about 1 in 13 calls on real clips returned unparseable JSON. One retry fixes nearly all of them, and a second failure falls back cleanly.
  - **Browser throttling:** background browser tabs slowed the pipeline from 17s to 245s per clip, so the demo runs in a foreground tab.
  - **No real labels:** there's no labeled school footage to measure on, so we wrote a frozen scenario set and a repeatable eval rather than quote a guessed accuracy.

## Run it locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill these in `.env.local`. Never commit them.

| Variable                                                           | Used for                                     |
| ------------------------------------------------------------------ | -------------------------------------------- |
| `ANTHROPIC_API_KEY`                                                | Event detection                              |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client                              |
| `SUPABASE_SECRET_KEY`                                              | Server-side database and storage             |
| `VEIL_SIGNING_SECRET`                                              | Footage stamps                               |
| `VEIL_VAULT_KEY`                                                   | Wrapping per-face keys (a KMS in production) |

Database: run the files in [supabase/migrations](supabase/migrations) in order. Before each demo, run [supabase/reset-demo.sql](supabase/reset-demo.sql) and then [supabase/seed.sql](supabase/seed.sql).

| Command                              | What it does                                                  |
| ------------------------------------ | ------------------------------------------------------------- |
| `npm run dev`                        | Local server                                                  |
| `npm test`                           | 267 unit tests (model mocked)                                 |
| `npm run evals`                      | Demo-path evals against the real model                        |
| `npm run evals:learning -- --runs 3` | The learning curve experiment (about 270 model calls per run) |
| `npm run build`                      | Production build                                              |

## Known limits

- There's no real login yet. There's one demo identity, and every unlock records it.
- The face-key wrapping secret is a server env var. In production it moves to a KMS.
- The tamper hash is computed in the browser. In production it's computed at the recorder.
- Evals use written frame descriptions. A labeled video set from the first pilot will measure real accuracy.

## Credits

Sample clips are Pexels stock footage with actors. No real students appear. See [public/demo/CREDITS.md](public/demo/CREDITS.md).

Built with Chewbacca
