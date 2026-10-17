"use client";

import Link from "next/link";
import {
  ChevronRight,
  Film,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClipSummary } from "@/lib/contracts";

import { veilApi } from "./api";
import { formatStampDateTime, pluralize } from "./format";
import { EmptyState, ErrorState } from "./States";
import { useVeilQuery } from "./useVeilQuery";

export function ClipsList() {
  const { state, retry } = useVeilQuery("clips", veilApi.listClips);

  if (state.status === "loading") return <ClipsListSkeleton />;
  if (state.status === "error") {
    return <ErrorState message={state.message} onRetry={retry} />;
  }

  const clips = state.data;
  if (clips.length === 0) {
    return (
      <EmptyState
        icon={Film}
        title="No clips yet"
        description="Upload a 20 to 30 second clip. Faces are blurred and encrypted in your browser before anything is sent."
        action={
          <Link href="/clips/new" className={buttonVariants({ size: "lg" })}>
            <Upload aria-hidden />
            Upload a clip
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PrivacyTotals clips={clips} />
      <ul className="flex flex-col gap-3" aria-label="Clips">
        {clips.map((clip) => (
          <li key={clip.id}>
            <ClipRow clip={clip} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PrivacyTotals({ clips }: { clips: ClipSummary[] }) {
  const facesLocked = clips.reduce((sum, clip) => sum + clip.facesLocked, 0);
  const flagged = clips.reduce((sum, clip) => sum + clip.eventsFlagged, 0);
  const totals = [
    { label: "Clips stamped", value: clips.length, tone: "text-white" },
    { label: "Faces locked", value: facesLocked, tone: "text-indigo-300" },
    { label: "Stored in the clear", value: 0, tone: "text-emerald-300" },
    {
      label: "Alerts flagged",
      value: flagged,
      tone: flagged > 0 ? "text-amber-300" : "text-white",
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {totals.map((total) => (
        <div
          key={total.label}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
        >
          <dt className="text-xs font-medium text-zinc-500">{total.label}</dt>
          <dd
            className={cn(
              "mt-1 text-2xl font-semibold tracking-tight tabular-nums",
              total.tone,
            )}
          >
            {total.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ClipRow({ clip }: { clip: ClipSummary }) {
  const hasAlerts = clip.eventsFlagged > 0;
  return (
    <Link
      href={`/clips/${clip.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 outline-none transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-900/80 focus-visible:ring-2 focus-visible:ring-indigo-500 sm:p-5"
    >
      <div className="hidden rounded-xl bg-zinc-800 p-2.5 text-zinc-300 sm:block">
        <Film className="size-5" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate font-mono text-sm font-medium text-zinc-100">
          {clip.filename}
        </p>
        <p className="text-xs text-zinc-500">
          {clip.siteName} · stamped {formatStampDateTime(clip.stampedAt)}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
            <ShieldCheck className="size-3.5" aria-hidden />
            {pluralize(clip.facesLocked, "face")} locked
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
              hasAlerts
                ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                : "border-zinc-700 bg-zinc-800/60 text-zinc-400",
            )}
          >
            <TriangleAlert className="size-3.5" aria-hidden />
            {hasAlerts
              ? `${pluralize(clip.eventsFlagged, "alert")} to review`
              : "No alerts"}
          </span>
        </div>
      </div>
      <ChevronRight
        className="size-5 shrink-0 text-zinc-600 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-300"
        aria-hidden
      />
    </Link>
  );
}

function ClipsListSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading clips</span>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl bg-zinc-900" />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-24 rounded-2xl bg-zinc-900" />
      ))}
    </div>
  );
}
