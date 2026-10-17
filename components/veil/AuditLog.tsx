"use client";

import Link from "next/link";
import { Film, LockKeyhole, UserRound } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { AuditEntry, ClipSummary } from "@/lib/contracts";

import { veilApi } from "./api";
import {
  REASON_CATEGORY_LABELS,
  formatStampDateTime,
  pluralize,
} from "./format";
import { EmptyState, ErrorState } from "./States";
import { useVeilQuery } from "./useVeilQuery";

export function AuditLog() {
  const audit = useVeilQuery("audit", veilApi.listAudit);
  const clips = useVeilQuery("clips", veilApi.listClips);

  if (audit.state.status === "loading") return <AuditSkeleton />;
  if (audit.state.status === "error") {
    return <ErrorState message={audit.state.message} onRetry={audit.retry} />;
  }

  const entries = audit.state.data;
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={LockKeyhole}
        title="No faces unlocked"
        description="Every face in every clip is still sealed. When someone unlocks one, their name, reason, and the time show up here."
      />
    );
  }

  const clipNames = new Map<string, string>(
    clips.state.status === "success"
      ? clips.state.data.map((clip: ClipSummary) => [clip.id, clip.filename])
      : [],
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-400">
        {pluralize(entries.length, "unlock")}, newest first. Each one names a
        person and a reason.
      </p>
      <ol className="relative flex flex-col gap-4 border-l border-zinc-800 pl-6 sm:pl-8">
        {entries.map((entry) => (
          <AuditRow
            key={entry.id}
            entry={entry}
            clipName={clipNames.get(entry.clipId)}
          />
        ))}
      </ol>
    </div>
  );
}

function AuditRow({
  entry,
  clipName,
}: {
  entry: AuditEntry;
  clipName: string | undefined;
}) {
  return (
    <li className="relative">
      <span
        aria-hidden
        className="absolute top-6 -left-[31px] grid size-3.5 place-items-center rounded-full bg-zinc-950 ring-2 ring-amber-400/70 sm:-left-[39px]"
      />
      <article className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
            <UserRound className="size-4 text-zinc-400" aria-hidden />
            {entry.actor}
          </p>
          <time
            dateTime={entry.createdAt}
            className="font-mono text-xs text-zinc-500"
          >
            {formatStampDateTime(entry.createdAt)}
          </time>
        </div>

        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
            <LockKeyhole className="size-3" aria-hidden />
            {REASON_CATEGORY_LABELS[entry.reasonCategory]}
          </span>
          <blockquote className="border-l-2 border-zinc-700 pl-3 text-sm leading-relaxed text-zinc-300">
            {entry.reason}
          </blockquote>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
          <Link
            href={`/clips/${entry.clipId}`}
            className="inline-flex items-center gap-1.5 rounded-md text-zinc-300 outline-none transition-all duration-200 hover:text-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Film className="size-3.5" aria-hidden />
            <span className="font-mono">{clipName ?? "Open clip"}</span>
          </Link>
          <span className="font-mono">face {entry.faceId.slice(0, 8)}</span>
          <span className="font-mono">entry {entry.id.slice(0, 8)}</span>
        </div>
      </article>
    </li>
  );
}

function AuditSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <span className="sr-only">Loading audit log</span>
      <Skeleton className="h-5 w-72 bg-zinc-900" />
      {Array.from({ length: 2 }, (_, index) => (
        <Skeleton key={index} className="h-44 rounded-2xl bg-zinc-900" />
      ))}
    </div>
  );
}
