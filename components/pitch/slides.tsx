"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Minus } from "lucide-react";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";

import { SOURCES } from "./sources";
import {
  FaceLockGrid,
  Figure,
  LiveLearning,
  Reveal,
  SlideFrame,
  SourceLink,
} from "./visuals";

export interface PitchSlide {
  id: string;
  /** The job this slide does in the pitch: Hook, Problem, Ask. */
  job: string;
  /** Why a judge needs this slide. Shown in the pitch anatomy overview. */
  why: string;
  /** Speaking budget. The deck's timer warns when a slide runs over. */
  seconds: number;
  say: string[];
  question?: { ask: string; answer: string };
  Content: () => ReactNode;
}

// Add teammates here. Every name on the team slide comes from this list.
const TEAM = [
  {
    name: "Sid Chowdhury",
    role: "Product, design and build",
    line: "USC Iovine and Young Academy and Marshall, Business of Innovation",
  },
] as const;

// From the repo on 2026-10-17: git log, app/api routes, npm test.
const BUILD_STATS = [
  ["84", "Commits"],
  ["8", "API routes"],
  ["207", "Tests passing"],
] as const;

const DEMO_STEPS = [
  {
    action: "Upload a 20 to 30 second clip",
    proves:
      "Every face is blurred and encrypted before upload. 0 stored in the clear.",
    href: "/clips/new",
  },
  {
    action: "The AI flags a possible fall at 0:14",
    proves: "The model found it from blurred frames. It never saw a face.",
    href: "/clips",
  },
  {
    action: "Mark it False alarm: they sat down to tie a shoe",
    proves: "One label moves the fall threshold for every site.",
    href: "/learning",
  },
  {
    action: "A similar clip is not flagged. A real fall still is",
    proves: "Fewer false pages, no missed falls.",
    href: "/clips/new",
  },
  {
    action: "Unlock one face. The app demands a reason",
    proves: "The audit row is written before the key leaves the server.",
    href: "/audit",
  },
  {
    action: "Change one byte of the clip and press Verify",
    proves: "Tampered. The hash no longer matches the upload stamp.",
    href: "/verify",
  },
] as const;

const PIPELINE = [
  {
    where: "Browser",
    lines: [
      "Pulls up to 20 frames",
      "Finds and blurs every face",
      "Encrypts each face crop, one AES-GCM key per face",
      "SHA-256 of the original file",
    ],
  },
  {
    where: "Server",
    lines: [
      "Stores blurred frames and ciphertext only",
      "Signs the hash and upload time with HMAC",
      "Releases a face key only after the audit row lands",
    ],
  },
  {
    where: "Model",
    lines: [
      "claude-sonnet-5-5 reads blurred frames",
      "Few-shot examples from every site's labels",
      "Output parsed with Zod, fallback on failure",
    ],
  },
  {
    where: "Officer",
    lines: [
      "Marks each alert Real or False alarm",
      "Unlocks a face only with a written reason",
      "Verifies any clip against its stamp",
    ],
  },
] as const;

const WHY_NOW = [
  {
    when: "Dec 2023",
    what: "The FTC bans Rite Aid from facial recognition for five years after it flagged shoppers as shoplifters.",
    source: SOURCES.riteAid,
  },
  {
    when: "Jul 2024",
    what: "Meta agrees to pay Texas $1.4B over facial recognition. The largest privacy settlement any state has won.",
    source: SOURCES.metaTexas,
  },
  {
    when: "Feb 2025",
    what: "The EU AI Act bans building face databases from CCTV. Fines reach 7% of global turnover.",
    source: SOURCES.euAiAct,
  },
  {
    when: "2026",
    what: "Vision models can flag a fall from a blurred frame. Detection no longer needs a face.",
  },
] as const;

type Cell = { kind: "yes" | "no" | "unknown"; text: string };

const COMPETITION: { row: string; veil: Cell; verkada: Cell }[] = [
  {
    row: "Faces blurred in stored footage",
    veil: { kind: "yes", text: "Blurred and encrypted before upload" },
    verkada: { kind: "no", text: "Blurred on screen only" },
  },
  {
    row: "Works with existing cameras",
    veil: { kind: "yes", text: "Any camera that exports a video file" },
    verkada: { kind: "no", text: "Verkada hardware only" },
  },
  {
    row: "Detection model never sees a face",
    veil: { kind: "yes", text: "Reads blurred frames only" },
    verkada: { kind: "unknown", text: "Not stated in the cited update" },
  },
  {
    row: "Each face unlock needs a written reason",
    veil: { kind: "yes", text: "Logged before the key is released" },
    verkada: { kind: "unknown", text: "Not stated in the cited update" },
  },
  {
    row: "Tamper check on every clip",
    veil: { kind: "yes", text: "Hash stamped at upload" },
    verkada: { kind: "unknown", text: "Not stated in the cited update" },
  },
];

const RISKS = [
  {
    risk: "No login yet",
    plan: "One demo identity by design. Supabase auth and roles ship before any real site.",
  },
  {
    risk: "Demo key handling",
    plan: "Face keys are wrapped with a server secret today. Production moves that secret into a KMS.",
  },
  {
    risk: "Hash computed in the browser",
    plan: "The stamp proves when a file arrived, not that the browser hashed the true original. Next: hash at the recorder.",
  },
  {
    risk: "One site can sway everyone",
    plan: "Learning is pooled. Cap how far any one site moves a threshold, and give fire a ceiling.",
  },
  {
    risk: "Evals are text cases",
    plan: "11 written cases prove the demo path. A labeled video set from a pilot proves accuracy.",
  },
] as const;

export const SLIDES: PitchSlide[] = [
  {
    id: "hook",
    job: "Hook",
    why: "Judges decide in the first 15 seconds whether to keep listening.",
    seconds: 15,
    say: [
      "93% of US public schools run security cameras.",
      "Every one of those cameras stores every student's face.",
      "Watch these lock. That counter on the right is the whole product: zero faces stored in the clear.",
    ],
    Content: () => (
      <div className="mx-auto grid min-h-full w-full max-w-7xl grid-cols-1 items-center gap-10 py-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col gap-8">
          <Reveal>
            <p className="label-mono">Cam 03 / Hallway B / Recording</p>
          </Reveal>
          <Reveal order={1}>
            <h1 className="max-w-[12ch] font-display text-display font-bold">
              Every camera records every face.
            </h1>
          </Reveal>
          <Reveal order={2} className="flex max-w-md flex-col gap-4">
            <p className="text-base leading-relaxed text-ink-muted md:text-lg">
              <span className="text-ink">93% of US public schools</span> use
              security cameras. The footage they keep holds every student who
              walked past.
            </p>
            <SourceLink source={SOURCES.nces} />
          </Reveal>
        </div>
        <Reveal order={3}>
          <FaceLockGrid />
        </Reveal>
      </div>
    ),
  },
  {
    id: "problem",
    job: "Problem",
    why: "A painful, specific problem makes every later slide matter.",
    seconds: 25,
    say: [
      "Stored faces are a liability, not an asset.",
      "Meta paid Texas $1.4 billion. Facebook paid $650 million in Illinois.",
      "And in 2021 hackers got live access to 150,000 Verkada cameras, inside schools and hospitals.",
      "If the face is on the server, it can leak. That is the problem we remove.",
    ],
    question: {
      ask: "Isn't this a legal problem, not a product problem?",
      answer:
        "The fines are the symptom. A face that is never stored in the clear cannot leak in the clear. That is a product decision.",
    },
    Content: () => (
      <SlideFrame
        kicker="02 / The problem"
        title="Stored faces are a liability."
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
          <Figure
            order={1}
            figure="$1.4B"
            text="Meta's settlement with Texas over facial recognition, 2024."
            source={SOURCES.metaTexas}
          />
          <Figure
            order={2}
            figure="$650M"
            text="Facebook's Illinois biometric privacy settlement, 2021."
            source={SOURCES.facebook}
          />
          <Figure
            order={3}
            figure="150,000"
            text="Verkada cameras hackers reached live in 2021, in schools, hospitals and prisons."
            source={SOURCES.verkadaBreach}
          />
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "solution",
    job: "Solution",
    why: "One sentence a judge can repeat to the next judge.",
    seconds: 20,
    say: [
      "Veil is security camera review that forgets faces unless there is a reason to remember.",
      "Five promises, and you will see each one in the demo.",
    ],
    question: {
      ask: "Why not just delete footage sooner?",
      answer:
        "Then it is gone when a fall or a fight needs review. Veil keeps the event and locks the identity.",
    },
    Content: () => (
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col justify-center gap-10 py-6 md:gap-14">
        <Reveal className="flex flex-col gap-6">
          <p className="label-mono">03 / The solution</p>
          <p className="max-w-[18ch] font-display text-headline font-bold text-balance uppercase">
            Veil forgets faces unless there is a reason to remember.
          </p>
        </Reveal>
        <ol className="grid grid-cols-1 border-t border-hairline sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Blurred in the browser", "Encrypted per face before upload"],
            ["Blind AI", "Detection runs on blurred frames"],
            ["Shared learning", "Every label tunes every site"],
            ["Costly unlock", "A written reason, logged first"],
            ["Stamped footage", "One changed byte reads Tampered"],
          ].map(([title, body], index) => (
            <li
              key={title}
              className="border-b border-hairline lg:border-r lg:last:border-r-0"
            >
              <Reveal
                order={index + 1}
                className="flex h-full flex-col gap-3 py-5 lg:px-5 lg:first:pl-0"
              >
                <span className="label-mono tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-title font-bold uppercase">
                  {title}
                </span>
                <span className="text-sm leading-relaxed text-ink-muted">
                  {body}
                </span>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    id: "demo",
    job: "Live demo",
    why: "Proof beats promises. Judges score what they watch work.",
    seconds: 90,
    say: [
      "Switch to the console. Each link opens in a new tab, so this deck stays put.",
      "Narrate what each step proves, not what you are clicking.",
      "If analysis is slow, say: the clip is already stored and blurred, the model is reading blurred frames.",
    ],
    question: {
      ask: "What if the AI misses a real fall?",
      answer:
        "Every event is stored, even under the threshold. The threshold only decides who gets paged. Recall was 1.00 for every type in our evals.",
    },
    Content: () => (
      <SlideFrame kicker="04 / Live demo" title="Watch it run." isSignal>
        <ol className="grid grid-cols-1 border-t border-hairline md:grid-cols-2 lg:grid-cols-3">
          {DEMO_STEPS.map((step, index) => (
            <li
              key={step.action}
              className="border-b border-hairline md:odd:border-r lg:border-r lg:[&:nth-child(3n)]:border-r-0"
            >
              <Reveal order={index + 1} className="h-full">
                <a
                  href={step.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full cursor-pointer flex-col gap-3 p-4 transition-colors duration-500 ease-veil hover:bg-panel focus-visible:bg-panel focus-visible:outline-none md:p-5"
                >
                  <span className="flex items-center justify-between">
                    <span className="label-mono tabular-nums">
                      Step {String(index + 1).padStart(2, "0")}
                    </span>
                    <ArrowUpRight
                      className="size-4 text-ink-dim transition-colors duration-500 ease-veil group-hover:text-ink"
                      aria-hidden
                    />
                  </span>
                  <span className="text-base font-semibold text-ink">
                    {step.action}
                  </span>
                  <span className="text-sm leading-relaxed text-ink-muted">
                    <span className="label-mono text-signal">Proves </span>
                    {step.proves}
                  </span>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </Reveal>
            </li>
          ))}
        </ol>
        <Reveal order={7}>
          <Link
            href="/clips/new"
            target="_blank"
            className={buttonVariants({ size: "lg" })}
          >
            Open the console
            <ArrowRight aria-hidden />
          </Link>
        </Reveal>
      </SlideFrame>
    ),
  },
  {
    id: "how",
    job: "How it works",
    why: "Shows the claim is real engineering, not a mockup.",
    seconds: 20,
    say: [
      "The line between browser and server is the product.",
      "Faces are blurred and encrypted on the officer's device. The server and the model only ever get blurred frames.",
      "A face key leaves the server only after the audit row is written.",
    ],
    question: {
      ask: "Can Veil's own staff see faces?",
      answer:
        "Each face crop is encrypted in the browser with its own key. The server holds that key wrapped, and releases it only after the audit row is written. In production the wrapping secret moves to a KMS.",
    },
    Content: () => (
      <SlideFrame kicker="05 / How it works" title="The AI never sees a face.">
        <div className="grid grid-cols-1 border-t border-l border-hairline md:grid-cols-4">
          {PIPELINE.map((stage, index) => (
            <Reveal
              key={stage.where}
              order={index + 1}
              className={cn(
                "relative flex flex-col gap-4 border-r border-b border-hairline p-5",
                index === 0 && "bg-panel",
              )}
            >
              <span className="flex items-center justify-between">
                <span className="font-display text-title font-bold uppercase">
                  {stage.where}
                </span>
                <span className="label-mono tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </span>
              <ul className="flex flex-col gap-2.5">
                {stage.lines.map((line) => (
                  <li
                    key={line}
                    className="text-sm leading-relaxed text-ink-muted"
                  >
                    {line}
                  </li>
                ))}
              </ul>
              {index === 0 && (
                <span className="label-mono mt-auto border-t border-hairline-strong pt-3 text-ink">
                  Nothing leaves here with a face in the clear
                </span>
              )}
            </Reveal>
          ))}
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "moat",
    job: "Moat",
    why: "Answers why a bigger company cannot copy this next quarter.",
    seconds: 25,
    say: [
      "This is the part that compounds.",
      "An officer marks a shoe-tie False alarm. The fall threshold moves from 0.58 to 0.60 for every site.",
      "More sites, more labels, fewer false pages. A copy starts at zero labels.",
    ],
    question: {
      ask: "Can one bad site poison everyone?",
      answer:
        "Today, a little: learning is pooled. The fix is capping how far one site can move a threshold. It is on our risks slide.",
    },
    Content: () => (
      <div className="mx-auto grid min-h-full w-full max-w-7xl grid-cols-1 items-center gap-10 py-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col gap-8">
          <Reveal className="flex flex-col gap-5">
            <p className="label-mono text-signal">06 / The moat</p>
            <h2 className="max-w-[16ch] font-display text-headline font-bold">
              Every label teaches every site.
            </h2>
          </Reveal>
          <Reveal order={1} className="flex flex-col border-t border-hairline">
            {[
              ["Officer decision", "Shoe-tie marked false alarm"],
              ["Fall threshold", "0.58 to 0.60"],
              ["Applies to", "Every site on Veil"],
              ["Next shoe-tie", "Not flagged"],
              ["Next real fall", "Flagged, 0.93"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-4 border-b border-hairline py-3"
              >
                <span className="label-mono">{label}</span>
                <span className="text-right font-mono text-sm tracking-[0.06em] text-ink uppercase tabular-nums">
                  {value}
                </span>
              </div>
            ))}
          </Reveal>
          <Reveal order={2}>
            <p className="font-mono text-xs leading-relaxed text-ink-muted">
              threshold = 0.4 + 0.5 x false-alarm rate, per event type
            </p>
          </Reveal>
        </div>
        <Reveal order={3}>
          <LiveLearning />
        </Reveal>
      </div>
    ),
  },
  {
    id: "proof",
    job: "Proof",
    why: "Numbers you measured beat adjectives every time.",
    seconds: 20,
    say: [
      "207 automated tests pass, covering the crypto, the learning math and every route.",
      "11 of 11 eval cases passed on two runs. Recall was 1.00 on every event type.",
      "Fall precision is 0.67 because the demo's first shoe-tie alert is meant to fire. That is the false alarm the officer teaches away.",
    ],
    question: {
      ask: "Are 11 cases enough?",
      answer:
        "No. They prove the demo path, not real-world accuracy. A labeled video set from a pilot is next.",
    },
    Content: () => (
      <SlideFrame kicker="07 / Proof" title="Tested, not just demoed.">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
          {[
            [
              "207",
              "Automated tests passing: crypto round trips, thresholds, audit-first unlock, tamper checks.",
            ],
            [
              "11 / 11",
              "Eval cases passed on two separate runs against the pinned model.",
            ],
            [
              "1.00",
              "Recall on every event type: fall, fight, theft, fire, other.",
            ],
          ].map(([figure, text], index) => (
            <Reveal
              key={figure}
              order={index + 1}
              className="flex flex-col gap-4 border-t border-hairline-strong pt-5"
            >
              <span className="font-display text-counter font-bold tracking-tight text-ink tabular-nums">
                {figure}
              </span>
              <span className="max-w-xs text-base leading-relaxed text-ink-muted">
                {text}
              </span>
            </Reveal>
          ))}
        </div>
        <Reveal order={4}>
          <p className="label-mono max-w-2xl leading-relaxed">
            Source: npm test and npm run evals, 2026-10-16. Evals are
            hand-written frame descriptions, not a video benchmark.
          </p>
        </Reveal>
      </SlideFrame>
    ),
  },
  {
    id: "why-now",
    job: "Why now",
    why: "Shows the window is open today and was closed before.",
    seconds: 20,
    say: [
      "Regulators moved first. The FTC banned Rite Aid's facial recognition. The EU banned face databases from CCTV.",
      "And the technology finally caught up: a vision model can flag a fall without ever seeing a face.",
    ],
    question: {
      ask: "Why hasn't an incumbent built this?",
      answer:
        "Their own product notes say their blur runs on screen only, on their hardware only. Encrypting at the source means rebuilding storage, not adding a filter.",
    },
    Content: () => (
      <SlideFrame
        kicker="08 / Why now"
        title="Regulators moved. The models caught up."
      >
        <ol className="grid grid-cols-1 border-t border-hairline md:grid-cols-4">
          {WHY_NOW.map((item, index) => (
            <li
              key={item.when}
              className="border-b border-hairline md:border-r md:last:border-r-0"
            >
              <Reveal
                order={index + 1}
                className="flex h-full flex-col gap-4 py-6 md:px-5 md:first:pl-0"
              >
                <span
                  className={cn(
                    "font-mono text-sm tracking-[0.1em] uppercase",
                    "source" in item ? "text-ink" : "text-signal",
                  )}
                >
                  {item.when}
                </span>
                <span className="text-base leading-relaxed text-ink-muted">
                  {item.what}
                </span>
                <span className="mt-auto">
                  {"source" in item ? (
                    <SourceLink source={item.source} />
                  ) : (
                    <span className="label-mono">Shown in this demo</span>
                  )}
                </span>
              </Reveal>
            </li>
          ))}
        </ol>
      </SlideFrame>
    ),
  },
  {
    id: "market",
    job: "Market",
    why: "Proves the prize is big enough to build a company on.",
    seconds: 20,
    say: [
      "Video surveillance equipment and software is a $35.5 billion market this year, heading to $47.9 billion by 2030.",
      "We start where the stakes are clearest: schools. 93% already have the cameras.",
      "Then stores, then hospitals. The schema already supports all three.",
    ],
    question: {
      ask: "How big is your slice?",
      answer:
        "We will not put a guessed share on a slide. A paid pilot sets the price, and the price sets the slice.",
    },
    Content: () => (
      <SlideFrame
        kicker="09 / Market"
        title="Schools first. Every camera next."
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
          <Figure
            order={1}
            figure="$35.5B"
            text="Global video surveillance equipment and software, 2025, at factory-gate prices."
            source={SOURCES.memoori}
          />
          <Figure
            order={2}
            figure="$47.9B"
            text="The same market's 2030 forecast."
            source={SOURCES.memoori}
          />
          <Figure
            order={3}
            figure="93%"
            text="US public schools using security cameras, 2021 to 2022. Our first buyer."
            source={SOURCES.nces}
          />
        </div>
        <Reveal order={4} className="flex flex-wrap items-center gap-3">
          {["Schools", "Stores", "Hospitals"].map((kind, index) => (
            <span key={kind} className="flex items-center gap-3">
              <span
                className={cn(
                  "label-mono border px-3 py-1.5",
                  index === 0
                    ? "border-ink text-ink"
                    : "border-hairline-strong",
                )}
              >
                {kind}
              </span>
              {index < 2 && (
                <ArrowRight className="size-4 text-ink-dim" aria-hidden />
              )}
            </span>
          ))}
        </Reveal>
      </SlideFrame>
    ),
  },
  {
    id: "competition",
    job: "Competition",
    why: "Judges know the incumbents. Name them before they do.",
    seconds: 20,
    say: [
      "The closest product is Verkada's Live Face Blur.",
      "It blurs on screen. The stored footage keeps the real faces, and it runs only on Verkada hardware.",
      "We blur the file, not the screen, on cameras schools already own.",
    ],
    question: {
      ask: "What stops them copying this?",
      answer:
        "Rebuilding storage around per-face encryption, and our label network. A copy starts at zero labels.",
    },
    Content: () => (
      <SlideFrame
        kicker="10 / Competition"
        title="They blur the screen. We blur the file."
      >
        <Reveal order={1}>
          <table className="hidden w-full border-collapse text-left md:table">
            <thead>
              <tr className="border-b border-hairline-strong">
                <th scope="col" className="label-mono py-3 pr-4 font-normal">
                  Capability
                </th>
                <th
                  scope="col"
                  className="label-mono py-3 pr-4 font-normal text-ink"
                >
                  Veil
                </th>
                <th scope="col" className="label-mono py-3 font-normal">
                  Verkada Live Face Blur
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPETITION.map(({ row, veil, verkada }) => (
                <tr key={row} className="border-b border-hairline">
                  <th
                    scope="row"
                    className="py-3.5 pr-4 text-sm font-semibold text-ink"
                  >
                    {row}
                  </th>
                  <td className="py-3.5 pr-4">
                    <CellValue cell={veil} />
                  </td>
                  <td className="py-3.5">
                    <CellValue cell={verkada} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="flex flex-col border-t border-hairline-strong md:hidden">
            {COMPETITION.map(({ row, veil, verkada }) => (
              <li
                key={row}
                className="flex flex-col gap-2 border-b border-hairline py-3"
              >
                <span className="text-sm font-semibold text-ink">{row}</span>
                <span className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
                  <span className="label-mono pt-0.5 text-ink">Veil</span>
                  <CellValue cell={veil} />
                </span>
                <span className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
                  <span className="label-mono pt-0.5">Verkada</span>
                  <CellValue cell={verkada} />
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal order={2}>
          <SourceLink source={SOURCES.verkadaBlur} />
        </Reveal>
      </SlideFrame>
    ),
  },
  {
    id: "business",
    job: "Business model",
    why: "Shows who pays, for what, and why they keep paying.",
    seconds: 20,
    say: [
      "The district pays per camera, per month. No new hardware: Veil takes the video file their cameras already make.",
      "They keep paying because the audit log and the tamper stamps are the record a parent or a regulator asks for.",
      "We set the price in a paid pilot. We are not guessing it on a slide.",
    ],
    question: {
      ask: "What is the price?",
      answer:
        "Set in a paid pilot against what the district spends on review today. We will not quote a number we have not tested.",
    },
    Content: () => (
      <SlideFrame
        kicker="11 / Business model"
        title="Software on the cameras they already own."
      >
        <div className="grid grid-cols-1 border-t border-l border-hairline sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Who pays", "The district or store chain, per camera, per month."],
            [
              "Land",
              "No rip and replace. Any camera that exports a video file.",
            ],
            [
              "Keep",
              "Every unlock and every stamp is a written record, ready when a parent or regulator asks.",
            ],
            ["Price", "Set in a paid pilot. Not guessed on a slide."],
          ].map(([title, body], index) => (
            <Reveal
              key={title}
              order={index + 1}
              className="flex flex-col gap-3 border-r border-b border-hairline p-5"
            >
              <span className="label-mono text-ink">{title}</span>
              <span className="text-base leading-relaxed text-ink-muted">
                {body}
              </span>
            </Reveal>
          ))}
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "risks",
    job: "Risks",
    why: "Naming your own gaps earns trust. Judges probe them anyway.",
    seconds: 20,
    say: [
      "Here is what is not done, and the plan for each.",
      "The one that matters most is trust: key handling moves to a KMS before any real footage.",
    ],
    question: {
      ask: "What is your biggest risk?",
      answer:
        "Trust. A privacy product has to survive an audit, so key handling and login ship before any real footage.",
    },
    Content: () => (
      <SlideFrame kicker="12 / Risks" title="What we know is not done.">
        <ul className="flex flex-col border-t border-hairline">
          {RISKS.map(({ risk, plan }, index) => (
            <li key={risk} className="border-b border-hairline">
              <Reveal
                order={index + 1}
                className="grid grid-cols-1 gap-1 py-3.5 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-8"
              >
                <span className="text-sm font-semibold text-ink">{risk}</span>
                <span className="text-sm leading-relaxed text-ink-muted">
                  {plan}
                </span>
              </Reveal>
            </li>
          ))}
        </ul>
      </SlideFrame>
    ),
  },
  {
    id: "team",
    job: "Team",
    why: "Judges back people. Say why you are the ones to build it.",
    seconds: 15,
    say: [
      "Say why this problem is personal to the team, in one sentence.",
      "Then what each person built at this hackathon.",
    ],
    Content: () => (
      <SlideFrame
        kicker="13 / Team"
        title="Built at this hackathon, end to end."
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((person, index) => (
            <Reveal
              key={person.name}
              order={index + 1}
              className="flex flex-col gap-3 border-t border-hairline-strong pt-5"
            >
              <span className="font-display text-title font-bold uppercase">
                {person.name}
              </span>
              <span className="label-mono text-ink">{person.role}</span>
              <span className="text-sm leading-relaxed text-ink-muted">
                {person.line}
              </span>
            </Reveal>
          ))}
        </div>
        <Reveal
          order={TEAM.length + 1}
          className="grid max-w-3xl grid-cols-3 border-t border-hairline"
        >
          {BUILD_STATS.map(([figure, label]) => (
            <div key={label} className="flex flex-col gap-1 pt-4">
              <span className="font-mono text-2xl text-ink tabular-nums md:text-3xl">
                {figure}
              </span>
              <span className="label-mono">{label}</span>
            </div>
          ))}
        </Reveal>
        <Reveal order={TEAM.length + 2}>
          <p className="label-mono leading-relaxed">
            Next.js / Supabase / Claude vision / MediaPipe / Web Crypto
          </p>
        </Reveal>
      </SlideFrame>
    ),
  },
  {
    id: "ask",
    job: "Ask and close",
    why: "Tell judges exactly what you want, then end on the one line.",
    seconds: 15,
    say: [
      "We want three pilots: one school, one store, one hospital.",
      "If you know a district safety director, we would like that introduction.",
      "Veil. Cameras that forget faces.",
    ],
    question: {
      ask: "What would a pilot look like?",
      answer:
        "One school's existing cameras for a semester. We measure false pages per week before and after officers start labeling.",
    },
    Content: () => (
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col justify-center gap-10 py-6">
        <Reveal>
          <p className="label-mono">14 / The ask</p>
        </Reveal>
        <Reveal order={1}>
          <h2 className="max-w-[14ch] font-display text-display font-bold">
            Cameras that forget faces.
          </h2>
        </Reveal>
        <Reveal
          order={2}
          className="grid max-w-3xl grid-cols-1 border-t border-hairline sm:grid-cols-2"
        >
          {[
            ["Three pilots", "One school, one store, one hospital"],
            ["One intro", "A district safety director"],
          ].map(([title, body]) => (
            <div
              key={title}
              className="flex flex-col gap-1.5 border-b border-hairline py-4 sm:pr-6"
            >
              <span className="text-base font-semibold text-ink">{title}</span>
              <span className="text-sm text-ink-muted">{body}</span>
            </div>
          ))}
        </Reveal>
        <Reveal order={3}>
          <Link
            href="/clips/new"
            target="_blank"
            className={buttonVariants({ size: "lg" })}
          >
            Run the demo yourself
            <ArrowRight aria-hidden />
          </Link>
        </Reveal>
      </div>
    ),
  },
];

export const TOTAL_SECONDS = SLIDES.reduce(
  (total, slide) => total + slide.seconds,
  0,
);

function CellValue({ cell }: { cell: Cell }) {
  return (
    <span
      className={cn(
        "inline-flex items-start gap-2 text-sm leading-relaxed",
        cell.kind === "yes" ? "text-ink" : "text-ink-muted",
      )}
    >
      {cell.kind === "yes" ? (
        <Check className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
      ) : (
        <Minus className="mt-0.5 size-4 shrink-0 text-ink-dim" aria-hidden />
      )}
      {cell.text}
    </span>
  );
}
