"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Gavel,
  Globe,
  KeyRound,
  Landmark,
  ScanEye,
  ShieldAlert,
  Users,
  Waypoints,
  FlaskConical,
} from "lucide-react";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";
import { CountUp } from "@/components/veil/CountUp";
import { EASE_VEIL } from "@/components/veil/motion";

import { Headline, Reveal } from "./motion";
import {
  BreachField,
  CctvFeed,
  ConsoleEmbed,
  DataFlow,
  FaceSlider,
  LabelNetwork,
  LayerStack,
  MarketBars,
  SchoolUnits,
  SettlementBars,
  Terminal,
  ValueChain,
} from "./scenes";
import { SOURCES, type Source } from "./sources";
import { Kicker, SlideFrame, SourceLink } from "./visuals";

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

// From the repo on 2026-10-17: npm test and public/demo.
const BUILD_STATS = [
  { value: 244, label: "Tests passing" },
  { value: 33, label: "Test files" },
  { value: 7, label: "Real sample clips" },
] as const;

const DEMO_STEPS = [
  {
    action: "Run Passing period",
    proves:
      "Every head blurred before upload. Nothing flagged. 0 in the clear.",
    href: "/clips/new",
  },
  {
    action: "Run High-five",
    proves: "The AI flags a possible fight, from blurred frames only.",
    href: "/clips/new",
  },
  {
    action: "Mark it False alarm",
    proves: "Fight threshold 0.50 to 0.54, at every site.",
    href: "/learning",
  },
  {
    action: "Another high-five, then a student pinned to a wall",
    proves: "The high-five stays quiet. The real fight still flags.",
    href: "/clips/new",
  },
  {
    action: "Unlock one face",
    proves: "The audit row lands before the key leaves the server.",
    href: "/audit",
  },
  {
    action: "Change one byte, press Verify",
    proves: "Tampered. The hash no longer matches the upload stamp.",
    href: "/verify",
  },
] as const;

const WHY_NOW: {
  when: string;
  what: string;
  icon: ComponentType<{ className?: string }>;
  source?: Source;
}[] = [
  {
    when: "Dec 2023",
    what: "FTC bans Rite Aid from face recognition for five years",
    icon: Gavel,
    source: SOURCES.riteAid,
  },
  {
    when: "Jul 2024",
    what: "Meta pays Texas $1.4B over face recognition",
    icon: Landmark,
    source: SOURCES.metaTexas,
  },
  {
    when: "Feb 2025",
    what: "EU bans face databases built from CCTV",
    icon: Globe,
    source: SOURCES.euAiAct,
  },
  {
    when: "2026",
    what: "Vision models flag a fight from blurred frames",
    icon: ScanEye,
  },
];

const RISKS = [
  {
    icon: Users,
    risk: "No login yet",
    plan: "Supabase auth and roles before any real site.",
  },
  {
    icon: KeyRound,
    risk: "Demo key handling",
    plan: "The wrapping secret moves into a KMS.",
  },
  {
    icon: ShieldAlert,
    risk: "Hash computed in the browser",
    plan: "Hash at the recorder, so the stamp proves the true original.",
  },
  {
    icon: Waypoints,
    risk: "One site can sway everyone",
    plan: "Cap how far one site moves a threshold. Give fire a ceiling.",
  },
  {
    icon: FlaskConical,
    risk: "Evals are text cases",
    plan: "A labeled video set from the first pilot.",
  },
] as const;

const PROMISES = [
  "Blurred in the browser",
  "Blind AI",
  "Shared learning",
  "Costly unlock",
  "Stamped footage",
] as const;

function HookSlide() {
  return (
    <div className="mx-auto grid min-h-full w-full max-w-7xl grid-cols-1 items-center gap-8 py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:gap-14">
      <div className="flex flex-col gap-7">
        <Kicker text="Cam 03 / Hallway B / Recording" />
        <Headline
          as="h1"
          size="display"
          text="Every camera records every face."
          className="max-w-[12ch]"
        />
        <Reveal order={3} className="flex flex-col gap-3">
          <p className="max-w-sm text-base leading-relaxed text-ink-muted md:text-lg">
            <span className="text-ink">93% of US public schools</span> run
            security cameras.
          </p>
          <SourceLink source={SOURCES.nces} />
        </Reveal>
      </div>
      <Reveal order={2}>
        <CctvFeed />
      </Reveal>
    </div>
  );
}

function DemoSlide() {
  const [active, setActive] = useState(0);
  return (
    <div className="mx-auto grid min-h-full w-full max-w-7xl grid-cols-1 items-center gap-8 py-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.7fr)]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <Kicker text="04 / Live demo" isSignal />
          <Headline text="Watch it run." />
        </div>
        <Reveal order={1}>
          <ol className="flex flex-col border-t border-hairline">
            {DEMO_STEPS.map((step, index) => {
              const isActive = index === active;
              return (
                <li key={step.action} className="border-b border-hairline">
                  <button
                    type="button"
                    onClick={() => setActive(index)}
                    aria-current={isActive ? "step" : undefined}
                    className={cn(
                      "flex w-full cursor-pointer flex-col gap-1 px-3 py-2.5 text-left transition-colors duration-500 ease-veil outline-none hover:bg-panel focus-visible:ring-1 focus-visible:ring-signal",
                      isActive && "bg-panel",
                    )}
                  >
                    <span className="flex items-baseline gap-3">
                      <span
                        className={cn(
                          "label-mono tabular-nums",
                          isActive && "text-signal",
                        )}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isActive ? "text-ink" : "text-ink-muted",
                        )}
                      >
                        {step.action}
                      </span>
                    </span>
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="pl-8 text-xs leading-relaxed text-ink-muted"
                      >
                        {step.proves}
                      </motion.span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </Reveal>
        <Reveal order={2}>
          <p className="label-mono leading-relaxed">
            Click outside the screen to get the arrow keys back
          </p>
        </Reveal>
      </div>
      <Reveal order={1}>
        <ConsoleEmbed href={DEMO_STEPS[active].href} />
      </Reveal>
    </div>
  );
}

export const SLIDES: PitchSlide[] = [
  {
    id: "hook",
    job: "Hook",
    why: "Judges decide in the first 15 seconds whether to keep listening.",
    seconds: 15,
    say: [
      "93% of US public schools run security cameras.",
      "Every one of those cameras stores every student's face.",
      "This is a real hallway through Veil. Every head is blurred before the footage leaves the building.",
    ],
    Content: HookSlide,
  },
  {
    id: "problem",
    job: "Problem",
    why: "A painful, specific problem makes every later slide matter.",
    seconds: 25,
    say: [
      "Every amber dot is 100 cameras. In 2021 hackers got live access to all of these, inside schools and hospitals.",
      "And stored faces cost money: Meta paid Texas $1.4 billion. Facebook paid $650 million in Illinois.",
      "If the face is on the server, it can leak. We remove it.",
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
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16">
          <Reveal order={1} className="flex flex-col gap-3">
            <BreachField />
            <SourceLink source={SOURCES.verkadaBreach} />
          </Reveal>
          <Reveal order={2} className="flex flex-col gap-4">
            <SettlementBars
              rows={[
                {
                  value: 1.4,
                  decimals: 1,
                  prefix: "$",
                  suffix: "B",
                  label: "Meta to Texas, face recognition, 2024",
                  scale: 1,
                },
                {
                  value: 650,
                  prefix: "$",
                  suffix: "M",
                  label: "Facebook, Illinois biometric privacy, 2021",
                  scale: 0.65 / 1.4,
                },
              ]}
            />
            <SourceLink source={SOURCES.metaTexas} />
            <SourceLink source={SOURCES.facebook} />
          </Reveal>
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
      "Veil forgets faces unless there is a reason to remember.",
      "Drag the line. Same hallway, same second. Left is what every camera stores today. Right is what Veil stores.",
    ],
    question: {
      ask: "Why not just delete footage sooner?",
      answer:
        "Then it is gone when a fall or a fight needs review. Veil keeps the event and locks the identity.",
    },
    Content: () => (
      <SlideFrame
        kicker="03 / The solution"
        title="Veil forgets faces unless there is a reason to remember."
        titleClassName="max-w-[32ch]"
      >
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14">
          <Reveal order={1} className="flex flex-col gap-3">
            <FaceSlider />
            <span className="label-mono">Drag the line</span>
          </Reveal>
          <ol className="flex flex-col border-t border-hairline">
            {PROMISES.map((promise, index) => (
              <li key={promise} className="border-b border-hairline">
                <Reveal
                  order={index + 2}
                  className="flex items-baseline gap-4 py-3"
                >
                  <span className="label-mono tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-title font-bold uppercase">
                    {promise}
                  </span>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "demo",
    job: "Live demo",
    why: "Proof beats promises. Judges score what they watch work.",
    seconds: 90,
    say: [
      "The real console runs inside this slide. Click a step on the left to jump the screen to it.",
      "Narrate what each step proves, not what you are clicking.",
      "Reset the database before you present (supabase/reset-demo.sql, then seed.sql), or the high-five is already learned and will not flag.",
    ],
    question: {
      ask: "What if the AI misses a real fight?",
      answer:
        "Every event is stored, even under the threshold. The threshold only decides who gets paged, and the pinned-to-a-wall clip shows a real fight still gets through.",
    },
    Content: DemoSlide,
  },
  {
    id: "how",
    job: "How it works",
    why: "Shows the claim is real engineering, not a mockup.",
    seconds: 20,
    say: [
      "Follow one face. In the browser it is sharp. Before it crosses the amber line, it is blurred and locked.",
      "The server stores ciphertext. The model reads blurred frames and flags a possible fight. The officer decides.",
    ],
    question: {
      ask: "Can Veil's own staff see faces?",
      answer:
        "Each face crop is encrypted in the browser with its own key. The server holds that key wrapped, and releases it only after the audit row is written. In production the wrapping secret moves to a KMS.",
    },
    Content: () => (
      <SlideFrame kicker="05 / How it works" title="The AI never sees a face.">
        <Reveal order={1}>
          <DataFlow />
        </Reveal>
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
      "One officer marks a high-five as a false alarm. The hub passes it to every site. The fight threshold moves from 0.50 to 0.54 everywhere.",
      "More sites, more labels, fewer false pages. A copy starts at zero labels.",
    ],
    question: {
      ask: "Can one bad site poison everyone?",
      answer:
        "Today, a little: learning is pooled. The fix is capping how far one site can move a threshold. It is on our risks slide.",
    },
    Content: () => (
      <div className="mx-auto grid min-h-full w-full max-w-7xl grid-cols-1 items-center gap-10 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <Kicker text="06 / The moat" isSignal />
            <Headline text="Every label teaches every site." />
          </div>
          <Reveal order={2} className="flex flex-col border-t border-hairline">
            {[
              ["Officer marks", "High-five: false alarm"],
              ["Fight threshold", "0.50 to 0.54"],
              ["Pinned to a wall", "Still flagged"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-4 border-b border-hairline py-3"
              >
                <span className="label-mono">{label}</span>
                <span className="font-mono text-sm tracking-[0.06em] text-ink uppercase tabular-nums md:text-base">
                  {value}
                </span>
              </div>
            ))}
          </Reveal>
        </div>
        <Reveal order={1}>
          <LabelNetwork />
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
      "This is our real test output.",
      "244 tests pass: head blurring, per-face encryption, audit-first unlock, the learning math, tamper checks.",
      "13 eval cases cover every demo clip plus look-alikes, and run against the real model with npm run evals.",
    ],
    question: {
      ask: "How accurate is it on real video?",
      answer:
        "We do not know yet, and we will not guess. The evals prove the demo path. A labeled video set from the first pilot measures real accuracy.",
    },
    Content: () => (
      <SlideFrame kicker="07 / Proof" title="Tested, not just demoed.">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14">
          <Reveal order={1}>
            <Terminal />
          </Reveal>
          <Reveal order={2} className="flex flex-col">
            {[
              { value: 244, label: "Tests passing" },
              { value: 13, label: "Eval cases, every demo clip" },
              { value: 7, label: "Real clips with actors" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-baseline justify-between gap-4 border-b border-hairline py-4 first:border-t"
              >
                <CountUp
                  value={stat.value}
                  className="font-display text-5xl font-bold tracking-tight text-ink tabular-nums"
                />
                <span className="label-mono text-right">{stat.label}</span>
              </div>
            ))}
            <p className="label-mono mt-4 leading-relaxed">
              Evals are written frame descriptions, not a video benchmark
            </p>
          </Reveal>
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "why-now",
    job: "Why now",
    why: "Shows the window is open today and was closed before.",
    seconds: 20,
    say: [
      "Regulators moved first. The FTC banned Rite Aid's face recognition. Texas took $1.4 billion. The EU banned face databases from CCTV.",
      "And the models caught up: a vision model can flag a fight without ever seeing a face.",
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
        <div className="relative">
          <motion.span
            aria-hidden
            className="absolute top-7 right-0 left-0 hidden h-px origin-left bg-hairline-strong md:block"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.6, ease: EASE_VEIL, delay: 0.5 }}
          />
          <ol className="grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-6">
            {WHY_NOW.map(({ when, what, icon: EventIcon, source }, index) => (
              <li key={when}>
                <Reveal order={index + 2} className="flex flex-col gap-4">
                  <span
                    className={cn(
                      "relative flex size-14 items-center justify-center border bg-void",
                      source
                        ? "border-ink text-ink"
                        : "border-signal text-signal",
                    )}
                  >
                    <EventIcon className="size-6" />
                  </span>
                  <span
                    className={cn(
                      "font-display text-4xl font-bold tracking-tight uppercase",
                      !source && "text-signal",
                    )}
                  >
                    {when}
                  </span>
                  <span className="text-base leading-relaxed text-ink-muted">
                    {what}
                  </span>
                  {source ? (
                    <SourceLink source={source} />
                  ) : (
                    <span className="label-mono">Shown in this demo</span>
                  )}
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "market",
    job: "Market",
    why: "Proves the prize is big enough to build a company on.",
    seconds: 20,
    say: [
      "93 of every 100 public schools already have the cameras. That is our first buyer.",
      "The wider market for surveillance equipment and software is $35.5 billion this year, $47.9 billion by 2030.",
      "Schools, then stores, then hospitals. The schema already supports all three.",
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
        <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal order={1} className="flex flex-col gap-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
              <SchoolUnits />
              <span className="font-display text-counter font-bold tracking-tight text-ink tabular-nums">
                <CountUp value={93} />%
              </span>
            </div>
            <SourceLink source={SOURCES.nces} />
          </Reveal>
          <Reveal order={2} className="flex flex-col gap-4">
            <MarketBars />
            <span className="label-mono">
              Video surveillance equipment and software, worldwide
            </span>
            <SourceLink source={SOURCES.memoori} />
          </Reveal>
        </div>
        <Reveal order={3} className="flex flex-wrap items-center gap-3">
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
      "Same screen, different disk.",
      "Verkada's Live Face Blur blurs what the guard sees. Underneath, the stored footage keeps the real face, and it only runs on Verkada hardware.",
      "Veil's disk holds ciphertext, one key per face, from any camera.",
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
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
          <Reveal order={1} className="flex flex-col gap-2">
            <span className="label-mono">Verkada Live Face Blur</span>
            <LayerStack variant="other" />
          </Reveal>
          <Reveal order={2} className="flex flex-col gap-2">
            <span className="label-mono text-signal">Veil</span>
            <LayerStack variant="veil" />
          </Reveal>
        </div>
        <Reveal order={3}>
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
      "No new hardware. Veil takes the video file the district's cameras already make.",
      "They pay per camera, per month, and keep paying because every unlock and stamp is the record a parent or regulator asks for.",
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
        <Reveal order={1}>
          <ValueChain />
        </Reveal>
        <Reveal
          order={2}
          className="grid grid-cols-1 border-t border-hairline sm:grid-cols-3"
        >
          {[
            ["Who pays", "District or chain, per camera, per month"],
            ["Why they stay", "Every unlock and stamp is on record"],
            ["Price", "Set in a paid pilot"],
          ].map(([title, body]) => (
            <div
              key={title}
              className="flex flex-col gap-1.5 border-b border-hairline py-4 sm:border-r sm:border-b-0 sm:px-5 sm:first:pl-0 sm:last:border-r-0"
            >
              <span className="label-mono text-ink">{title}</span>
              <span className="text-sm text-ink-muted">{body}</span>
            </div>
          ))}
        </Reveal>
      </SlideFrame>
    ),
  },
  {
    id: "risks",
    job: "Risks",
    why: "Naming your own gaps earns trust. Judges probe them anyway.",
    seconds: 20,
    say: [
      "Here is what is not done, and the fix for each.",
      "The one that matters most is trust: key handling moves to a KMS before any real footage.",
    ],
    question: {
      ask: "What is your biggest risk?",
      answer:
        "Trust. A privacy product has to survive an audit, so key handling and login ship before any real footage.",
    },
    Content: () => (
      <SlideFrame kicker="12 / Risks" title="What we know is not done.">
        <ul className="grid grid-cols-1 border-t border-l border-hairline sm:grid-cols-2 lg:grid-cols-5">
          {RISKS.map(({ icon: RiskIcon, risk, plan }, index) => (
            <li key={risk} className="border-r border-b border-hairline">
              <Reveal
                order={index + 1}
                className="flex h-full flex-col gap-4 p-5"
              >
                <span className="flex items-center justify-between">
                  <RiskIcon className="size-5 text-ink" />
                  <span className="label-mono border border-hairline-strong px-2 py-0.5">
                    Open
                  </span>
                </span>
                <span className="font-display text-lg font-bold uppercase">
                  {risk}
                </span>
                <span className="mt-auto text-sm leading-relaxed text-ink-muted">
                  <span className="label-mono text-ink">Fix </span>
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
          {BUILD_STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1 pt-4">
              <CountUp
                value={stat.value}
                className="font-display text-5xl font-bold tracking-tight text-ink tabular-nums md:text-6xl"
              />
              <span className="label-mono">{stat.label}</span>
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
      "Back to the hallway. Same camera, same students, no face stored. Veil: cameras that forget faces.",
    ],
    question: {
      ask: "What would a pilot look like?",
      answer:
        "One school's existing cameras for a semester. We measure false pages per week before and after officers start labeling.",
    },
    Content: () => (
      <div className="mx-auto grid min-h-full w-full max-w-7xl grid-cols-1 items-center gap-10 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div className="flex flex-col gap-8">
          <Kicker text="14 / The ask" />
          <Headline
            size="display"
            text="Cameras that forget faces."
            className="max-w-[12ch]"
          />
          <Reveal
            order={3}
            className="grid grid-cols-1 border-t border-hairline sm:grid-cols-2"
          >
            {[
              ["Three pilots", "A school, a store, a hospital"],
              ["One intro", "A district safety director"],
            ].map(([title, body]) => (
              <div
                key={title}
                className="flex flex-col gap-1.5 border-b border-hairline py-4 sm:pr-6"
              >
                <span className="text-base font-semibold text-ink">
                  {title}
                </span>
                <span className="text-sm text-ink-muted">{body}</span>
              </div>
            ))}
          </Reveal>
          <Reveal order={4}>
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
        <Reveal order={2}>
          <CctvFeed />
        </Reveal>
      </div>
    ),
  },
];

export const TOTAL_SECONDS = SLIDES.reduce(
  (total, slide) => total + slide.seconds,
  0,
);
