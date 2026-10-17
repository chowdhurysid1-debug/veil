"use client";

import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "cn";

import { Headline, Scramble } from "./motion";
import type { Source } from "./sources";

/** Standard slide layout: decoding mono kicker, masked headline, then the body. */
export function SlideFrame({
  kicker,
  title,
  children,
  isSignal = false,
  className,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
  isSignal?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-full w-full max-w-7xl flex-col justify-center gap-8 py-6 md:gap-10",
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        <Kicker text={kicker} isSignal={isSignal} />
        <Headline text={title} className="max-w-[22ch]" />
      </div>
      {children}
    </div>
  );
}

export function Kicker({
  text,
  isSignal = false,
}: {
  text: string;
  isSignal?: boolean;
}) {
  return (
    <p className={cn("label-mono", isSignal && "text-signal")}>
      <Scramble text={text} />
    </p>
  );
}

export function SourceLink({ source }: { source: Source }) {
  return (
    <a
      href={source.href}
      target="_blank"
      rel="noopener noreferrer"
      className="label-mono inline-flex cursor-pointer items-center gap-1.5 transition-colors duration-500 ease-veil hover:text-ink focus-visible:text-ink focus-visible:outline-none"
    >
      Source: {source.label}
      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
