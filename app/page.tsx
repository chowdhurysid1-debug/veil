import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";
import { FadeIn } from "@/components/veil/FadeIn";
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
    title: "Blurred in the browser",
    body: "Every head is found and blurred on your device, in every frame of the video. Each face is encrypted with its own key before anything uploads.",
  },
  {
    title: "AI sees blurred frames only",
    body: "Fights, falls, thefts and covered cameras are flagged from blurred frames, with a time and a confidence.",
  },
  {
    title: "Every label teaches every site",
    body: "Mark an alert Real or False alarm. Thresholds update for every school and store on Veil.",
  },
  {
    title: "A face costs a written reason",
    body: "One face decrypts for 30 seconds. The unlock is logged under your name before the key is released.",
  },
  {
    title: "Stamped on upload",
    body: "The file's SHA-256 is signed the moment it lands. Change one byte and Verify reads Tampered.",
  },
] as const;

// The demo's hallway clip after Veil's own pipeline: every head blurred in the
// browser. Stock footage with actors, see public/demo/CREDITS.md.
const HERO_VIDEO = "/demo/hero-hallway-blurred.mp4";
const HERO_POSTER = "/demo/hero-hallway-blurred.jpg";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col bg-void text-ink">
      <LandingNav />

      {/* 01: Hero, full-bleed blurred frame with console readouts. */}
      <header className="relative isolate flex min-h-dvh flex-col overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-35 grayscale"
          style={{ backgroundImage: `url("${HERO_POSTER}")` }}
        />
        <video
          aria-hidden
          src={HERO_VIDEO}
          poster={HERO_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 -z-10 size-full object-cover opacity-35 grayscale motion-reduce:hidden"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-void via-void/70 to-void/40"
        />

        <div className="flex items-center justify-between px-gutter py-6">
          <VeilLogo href="/" />
          <Link
            href="/clips"
            className="label-mono inline-flex items-center gap-1.5 text-ink-muted transition-colors duration-500 ease-veil hover:text-ink"
          >
            Open console
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        <div className="flex flex-1 flex-col justify-end gap-10 px-gutter pt-16 pb-16 md:pb-20">
          <FadeIn immediate className="flex flex-col gap-8">
            <p className="label-mono">
              Privacy-first video security / Schools, stores, hospitals
            </p>
            <h1 className="max-w-[14ch] font-display text-display font-bold">
              Cameras that forget faces.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-ink-muted md:text-lg">
              Every face is blurred and encrypted before upload. Seeing one
              takes a written reason.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/clips/new"
                className={buttonVariants({ size: "lg" })}
              >
                Run the demo
                <ArrowRight aria-hidden />
              </Link>
              <a
                href="#how-it-works"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                How it works
              </a>
            </div>
          </FadeIn>

          <FadeIn
            immediate
            delay={0.4}
            className="grid grid-cols-2 border-t border-hairline-strong pt-5 md:grid-cols-4"
          >
            <HeroReadout label="Cam 03 / Hallway B" value="Live review" />
            <HeroReadout label="Faces locked" value="07" />
            <HeroReadout label="Stored in the clear" value="00" />
            <HeroReadout label="Model input" value="Blurred only" />
          </FadeIn>
        </div>
      </header>

      <main>
        {/* 02: The idea, alone on the screen. */}
        <section
          aria-label="What Veil does"
          className="flex min-h-[80dvh] items-center border-t border-hairline px-gutter py-section"
        >
          <FadeIn className="flex max-w-6xl flex-col gap-8">
            <p className="label-mono">The principle</p>
            <p className="font-display text-headline font-bold text-balance uppercase">
              Veil forgets faces unless there is a reason to remember.
            </p>
          </FadeIn>
        </section>

        {/* 03: Why it matters, three sourced figures. */}
        <section
          id="problem"
          aria-labelledby="problem-heading"
          className="scroll-mt-20 border-t border-hairline px-gutter py-section"
        >
          <FadeIn className="mb-12 flex max-w-3xl flex-col gap-4 md:mb-16">
            <p className="label-mono">Why it matters</p>
            <h2
              id="problem-heading"
              className="font-display text-headline font-bold"
            >
              Stored faces are a liability.
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 border-t border-hairline md:grid-cols-3">
            <SourcedFigure
              figure="$650M"
              text="Facebook's settlement of an Illinois biometric privacy class action."
              source={SOURCES.facebook}
            />
            <SourcedFigure
              figure="7%"
              text="Of global turnover: the cap on EU AI Act fines. Building face databases from CCTV is banned."
              source={SOURCES.euAiAct}
            />
            <SourcedFigure
              figure="On screen only"
              text="Verkada's Live Face Blur keeps real faces in stored footage, on Verkada hardware only."
              source={SOURCES.verkada}
              isPhrase
            />
          </div>
        </section>

        {/* 04: The learning loop, the one place the accent appears on this page. */}
        <section
          aria-labelledby="learning-heading"
          className="border-t border-hairline px-gutter py-section"
        >
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
            <FadeIn className="flex flex-col gap-6">
              <p className="label-mono text-signal">Continual learning</p>
              <h2
                id="learning-heading"
                className="font-display text-headline font-bold"
              >
                Every label teaches every site.
              </h2>
              <p className="max-w-md text-base leading-relaxed text-ink-muted">
                One officer marks a hallway high-five as a false alarm. Every
                school on Veil stops paging for it. A student pinned to a wall
                still gets through.
              </p>
            </FadeIn>
            <FadeIn delay={0.2} className="border border-signal/40 bg-panel">
              <p className="label-mono border-b border-hairline px-5 py-3 text-ink">
                Example from the demo
              </p>
              <div className="flex flex-col gap-5 px-5 py-6">
                <ExampleLine
                  label="Officer decision"
                  value="High-five marked false alarm"
                />
                <ExampleLine
                  label="Fight threshold"
                  value="0.50 to 0.54"
                  isSignal
                />
                <ExampleLine label="Applies to" value="Every site" />
                <ExampleLine label="Next high-five" value="Not flagged" />
                <ExampleLine label="Next real fight" value="Flagged" />
              </div>
            </FadeIn>
          </div>
        </section>

        {/* 05: How it works, hairline rows. */}
        <section
          id="how-it-works"
          aria-labelledby="how-heading"
          className="scroll-mt-20 border-t border-hairline px-gutter py-section"
        >
          <FadeIn className="mb-12 flex flex-col gap-4 md:mb-16">
            <p className="label-mono">How it works</p>
            <h2
              id="how-heading"
              className="font-display text-headline font-bold"
            >
              Five steps. Zero faces exposed.
            </h2>
          </FadeIn>
          <ol className="border-t border-hairline">
            {STEPS.map(({ title, body }, index) => (
              <li key={title} className="border-b border-hairline">
                <FadeIn
                  delay={index * 0.08}
                  className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 gap-y-2 py-8 md:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)] md:items-baseline md:gap-x-10"
                >
                  <span className="label-mono tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-title font-bold uppercase">
                    {title}
                  </h3>
                  <p className="col-start-2 text-base leading-relaxed text-ink-muted md:col-start-3">
                    {body}
                  </p>
                </FadeIn>
              </li>
            ))}
          </ol>
        </section>

        {/* 06: One call to action. */}
        <section className="flex min-h-[70dvh] flex-col justify-center gap-10 border-t border-hairline px-gutter py-section">
          <FadeIn className="flex flex-col gap-10">
            <h2 className="max-w-[16ch] font-display text-display font-bold">
              Watch every face lock.
            </h2>
            <div>
              <Link
                href="/clips/new"
                className={buttonVariants({ size: "lg" })}
              >
                Run the demo
                <ArrowRight aria-hidden />
              </Link>
            </div>
            <p className="label-mono">
              Blurring, encryption and hashing run in your browser. Use footage
              you have rights to.
            </p>
          </FadeIn>
        </section>
      </main>

      <footer className="border-t border-hairline px-gutter py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col gap-4">
            <VeilLogo href="/" />
            <p className="label-mono max-w-xs leading-relaxed">
              Security cameras that forget faces unless there is a reason to
              remember.
            </p>
          </div>
          <FooterColumn
            title="Console"
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
        <p className="label-mono mt-12 border-t border-hairline pt-6">
          2026 Veil / Hackathon prototype / Demo footage uses actors, never real
          students
        </p>
      </footer>
    </div>
  );
}

function HeroReadout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 py-3 pr-4">
      <span className="label-mono">{label}</span>
      <span className="font-mono text-sm tracking-[0.08em] text-ink uppercase tabular-nums md:text-base">
        {value}
      </span>
    </div>
  );
}

function ExampleLine({
  label,
  value,
  isSignal = false,
}: {
  label: string;
  value: string;
  isSignal?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-4 last:border-b-0 last:pb-0">
      <span className="label-mono">{label}</span>
      <span
        className={cn(
          "font-mono text-sm tracking-[0.06em] uppercase tabular-nums",
          isSignal ? "text-signal" : "text-ink",
        )}
      >
        {value}
      </span>
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
    <FadeIn className="border-b border-hairline md:border-r md:border-b-0 md:last:border-r-0">
      <a
        href={source.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex h-full flex-col gap-6 py-10 outline-none focus-visible:ring-1 focus-visible:ring-signal md:px-8 md:py-12"
      >
        <span
          // Plain template, not cn(): cn() treats text-counter as a color and drops it.
          className={`font-display font-bold tracking-tight text-ink uppercase ${isPhrase ? "text-4xl md:text-5xl" : "text-counter"}`}
        >
          {figure}
        </span>
        <span className="max-w-xs text-base leading-relaxed text-ink-muted">
          {text}
        </span>
        <span className="label-mono mt-auto inline-flex items-center gap-1.5 transition-colors duration-500 ease-veil group-hover:text-ink">
          Source: {source.label}
          <ArrowUpRight className="size-3.5" aria-hidden />
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
    <div className="flex flex-col gap-4">
      <h2 className="label-mono text-ink">{title}</h2>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href}>
            {link.isExternal ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors duration-500 ease-veil hover:text-ink"
              >
                {link.label}
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-sm text-ink-muted transition-colors duration-500 ease-veil hover:text-ink"
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
