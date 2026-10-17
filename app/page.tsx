import Link from "next/link";
import {
  ArrowRight,
  Brain,
  ExternalLink,
  EyeOff,
  LockKeyholeOpen,
  ScanLine,
  Stamp,
} from "lucide-react";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";
import { FadeIn } from "@/components/veil/FadeIn";
import { HeroMockup } from "@/components/veil/HeroMockup";
import { LandingNav } from "@/components/veil/LandingNav";
import { VeilLogo } from "@/components/veil/VeilLogo";

// Every figure on this page comes from SPEC.md and links to its source.
const SOURCES = {
  facebook: {
    label: "Orrick InfoBytes, March 2021",
    href: "https://infobytes.orrick.com/2021-03-04/court-approves-650-million-biometric-privacy-class-action-settlement/",
  },
  euAiAct: {
    label: "Orrick, April 2025",
    href: "https://www.orrick.com/en/Insights/2025/04/EU-Commission-Publishes-Guidelines-on-the-Prohibited-AI-Practices-under-the-AI-Act",
  },
  verkada: {
    label: "Verkada product updates, November 2023",
    href: "https://www.verkada.com/blog/nov-2023-product-updates/",
  },
} as const;

const STEPS = [
  {
    icon: EyeOff,
    title: "Blurred before it leaves the browser",
    body: "Drop in a video file from any camera. Faces are found and blurred on your device, and each face crop is encrypted with its own key.",
  },
  {
    icon: ScanLine,
    title: "The AI only watches blurred frames",
    body: "Falls, fights, thefts, and fires are flagged from blurred frames alone, with a time and a confidence: possible fall at 0:14, 0.71.",
  },
  {
    icon: Brain,
    title: "Every label teaches every site",
    body: "Mark an alert Real or False alarm. Thresholds and examples update for every school and store on Veil, so the next kid tying a shoe pages nobody.",
  },
  {
    icon: LockKeyholeOpen,
    title: "Seeing a face takes a written reason",
    body: "Pick a reason, write it down, and one face decrypts for 30 seconds. The unlock is logged under your name before the key is released.",
  },
  {
    icon: Stamp,
    title: "Stamped the moment it uploads",
    body: "The original file's SHA-256 is signed on upload. Change one byte and Verify says Tampered, with the time of the stamp.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-50">
      <LandingNav />

      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-indigo-900/30 via-zinc-950 to-zinc-950"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)] bg-[size:24px_24px]"
        />

        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <VeilLogo href="/" />
          <Link
            href="/clips"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white"
          >
            Open the app
          </Link>
        </div>

        <div className="relative mx-auto grid min-h-[80vh] max-w-7xl grid-cols-1 items-center gap-16 px-4 pt-8 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:px-8">
          <FadeIn immediate className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
              <EyeOff className="size-3.5" aria-hidden />
              For school, store, and hospital safety teams
            </span>
            <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
              <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Security cameras that forget faces.
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-300">
              Veil blurs and encrypts every face in the browser, lets the AI
              watch only blurred frames, and makes anyone who wants to see a
              face write down why.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/clips/new"
                className={buttonVariants({ size: "lg" })}
              >
                Try it with a clip
                <ArrowRight aria-hidden />
              </Link>
              <a
                href="#how-it-works"
                className={buttonVariants({ variant: "ghost", size: "lg" })}
              >
                See how it works
              </a>
            </div>
          </FadeIn>
          <FadeIn immediate delay={0.15} className="px-2 pb-6 sm:px-6">
            <HeroMockup />
          </FadeIn>
        </div>
      </header>

      <main>
        <section
          id="problem"
          aria-labelledby="problem-heading"
          className="scroll-mt-20 border-t border-zinc-800/80 py-20 md:py-32"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-14 px-4 sm:px-6 lg:px-8">
            <FadeIn className="flex max-w-3xl flex-col gap-4">
              <h2
                id="problem-heading"
                className="text-3xl font-semibold tracking-tight md:text-4xl"
              >
                Every camera records every face. That footage is a liability.
              </h2>
              <p className="text-base leading-relaxed text-zinc-400">
                Schools, stores, and hospitals need cameras for safety. Stored
                face data is a legal and breach risk, and today&apos;s privacy
                tools only hide faces on screen.
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 divide-y divide-zinc-800 border-y border-zinc-800 md:grid-cols-3 md:divide-x md:divide-y-0">
              <SourcedFigure
                figure="$650M"
                text="What Facebook paid to settle an Illinois biometric privacy class action."
                source={SOURCES.facebook}
              />
              <SourcedFigure
                figure="7%"
                text="Of global turnover: the ceiling on EU AI Act fines. Building face databases from CCTV footage is a banned practice."
                source={SOURCES.euAiAct}
              />
              <SourcedFigure
                figure="On screen only"
                text="Verkada's Live Face Blur keeps real faces in stored footage, and it only works on Verkada hardware."
                source={SOURCES.verkada}
                isPhrase
              />
            </div>
          </div>
        </section>

        <section
          aria-label="What Veil does differently"
          className="relative overflow-hidden py-24 md:py-36"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-indigo-600/15 via-zinc-950 to-zinc-950"
          />
          <FadeIn className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-4xl font-bold tracking-tight text-balance md:text-6xl">
              Veil forgets faces{" "}
              <span className="bg-gradient-to-r from-indigo-300 to-indigo-500 bg-clip-text text-transparent">
                unless there is a reason to remember.
              </span>
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400">
              No face is stored in the clear. No model ever sees one. The only
              way back to a face is a written reason that stays in the log.
            </p>
          </FadeIn>
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-heading"
          className="scroll-mt-20 border-t border-zinc-800/80 py-20 md:py-32"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:px-8">
            <FadeIn className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
              <h2
                id="how-heading"
                className="text-3xl font-semibold tracking-tight md:text-4xl"
              >
                How a clip moves through Veil
              </h2>
              <p className="text-base leading-relaxed text-zinc-400">
                A safety officer uploads a clip, reviews one alert, and never
                sees a face they did not ask for. Works with any camera that
                exports a video file.
              </p>
            </FadeIn>

            <ol className="flex flex-col">
              {STEPS.map(({ icon: Icon, title, body }, index) => (
                <li
                  key={title}
                  className="border-b border-zinc-800/80 py-8 first:pt-0 last:border-b-0"
                >
                  <FadeIn
                    delay={index * 0.05}
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-5 sm:gap-8"
                  >
                    <span className="font-mono text-sm text-zinc-600 tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400">
                          <Icon className="size-5" aria-hidden />
                        </div>
                        <h3 className="text-lg font-semibold text-white">
                          {title}
                        </h3>
                      </div>
                      <p className="text-base leading-relaxed text-zinc-300">
                        {body}
                      </p>
                    </div>
                  </FadeIn>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 md:pb-32 lg:px-8">
          <FadeIn className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-600/25 via-zinc-900 to-zinc-900 px-6 py-14 text-center md:px-12 md:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-2/3 -translate-x-1/2 rounded-full bg-indigo-500/30 blur-3xl"
            />
            <h2 className="relative text-3xl font-semibold tracking-tight md:text-4xl">
              Upload a clip and watch every face lock
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-300">
              Blurring, encryption, and hashing run in your browser. Use footage
              you have the rights to.
            </p>
            <Link
              href="/clips/new"
              className={cn(buttonVariants({ size: "lg" }), "relative mt-8")}
            >
              Try it with a clip
              <ArrowRight aria-hidden />
            </Link>
          </FadeIn>
        </section>
      </main>

      <footer className="border-t border-zinc-800">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.4fr)] lg:px-8">
          <div className="flex flex-col gap-3">
            <VeilLogo href="/" />
            <p className="max-w-xs text-sm leading-relaxed text-zinc-500">
              Security cameras that forget faces unless there is a reason to
              remember.
            </p>
          </div>
          <FooterColumn
            title="Product"
            links={[
              { href: "/clips/new", label: "Upload a clip" },
              { href: "/learning", label: "Learning" },
              { href: "/audit", label: "Audit log" },
              { href: "/verify", label: "Verify footage" },
            ]}
          />
          <FooterColumn
            title="Sources"
            links={Object.values(SOURCES).map((source) => ({
              href: source.href,
              label: source.label,
              isExternal: true,
            }))}
          />
        </div>
        <div className="border-t border-zinc-800/80">
          <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-zinc-600 sm:px-6 lg:px-8">
            2026 Veil. Hackathon prototype. Demo footage uses actors, never
            real students.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SourcedFigure({
  figure,
  text,
  source,
  isPhrase = false,
}: {
  figure: string;
  text: string;
  source: { label: string; href: string };
  isPhrase?: boolean;
}) {
  return (
    <FadeIn className="flex flex-col gap-4 py-10 md:px-8 md:first:pl-0 md:last:pr-0">
      <a
        href={source.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col gap-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <span
          className={cn(
            "bg-gradient-to-br from-white to-zinc-500 bg-clip-text font-bold tracking-tight text-transparent transition-all duration-200 group-hover:from-indigo-200 group-hover:to-indigo-500",
            isPhrase ? "text-4xl md:text-5xl" : "text-6xl md:text-7xl",
          )}
        >
          {figure}
        </span>
        <span className="text-base leading-relaxed text-zinc-300">{text}</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-all duration-200 group-hover:text-indigo-300">
          Source: {source.label}
          <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </span>
      </a>
    </FadeIn>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; isExternal?: boolean }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            {link.isExternal ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-all duration-200 hover:text-white"
              >
                {link.label}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-sm text-zinc-500 transition-all duration-200 hover:text-white"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
