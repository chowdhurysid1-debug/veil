"use client";

import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CircleAlert,
  FileCheck,
  FileVideoCamera,
  Film,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "cn";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClipSummary, VerifyResponse } from "@/lib/contracts";
import { sha256File } from "@/lib/crypto";

import { veilApi } from "./api";
import { friendlyErrorMessage } from "./errors";
import { formatStampDateTime, formatStampTime } from "./format";
import { EmptyState, ErrorState } from "./States";
import { useVeilQuery } from "./useVeilQuery";

type Check =
  | { kind: "idle" }
  | { kind: "hashing" }
  | { kind: "ready"; sha256: string }
  | { kind: "verifying"; sha256: string }
  | { kind: "result"; sha256: string; result: VerifyResponse }
  | { kind: "error"; message: string };

export function VerifyPanel() {
  const { state, retry } = useVeilQuery("clips", veilApi.listClips);

  if (state.status === "loading") return <VerifySkeleton />;
  if (state.status === "error") {
    return <ErrorState message={state.message} onRetry={retry} />;
  }
  if (state.data.length === 0) {
    return (
      <EmptyState
        icon={Film}
        title="Nothing stamped yet"
        description="Upload a clip first. Its original file is hashed and stamped at upload, and this page checks files against that stamp."
        action={
          <Link href="/clips/new" className={buttonVariants({ size: "lg" })}>
            <Upload aria-hidden />
            Upload a clip
          </Link>
        }
      />
    );
  }
  return <VerifyForm clips={state.data} />;
}

function VerifyForm({ clips }: { clips: ClipSummary[] }) {
  const searchParams = useSearchParams();
  const requested = searchParams.get("clip");
  const [clipId, setClipId] = useState<string>(
    clips.find((clip) => clip.id === requested)?.id ?? clips[0].id,
  );
  const [file, setFile] = useState<File | null>(null);
  const [check, setCheck] = useState<Check>({ kind: "idle" });
  const clip = clips.find((candidate) => candidate.id === clipId) ?? clips[0];
  const clipLabels = Object.fromEntries(
    clips.map((candidate) => [candidate.id, candidate.filename]),
  );

  async function chooseFile(next: File) {
    setFile(next);
    setCheck({ kind: "hashing" });
    try {
      setCheck({ kind: "ready", sha256: await sha256File(next) });
    } catch {
      setCheck({
        kind: "error",
        message: "We couldn't read that file. Try choosing it again.",
      });
    }
  }

  async function verify() {
    if (check.kind !== "ready" && check.kind !== "result") return;
    const { sha256 } = check;
    setCheck({ kind: "verifying", sha256 });
    try {
      const result = await veilApi.verifyClip(clip.id, { sha256 });
      setCheck({ kind: "result", sha256, result });
    } catch (error) {
      setCheck({ kind: "error", message: friendlyErrorMessage(error) });
    }
  }

  const canVerify = check.kind === "ready" || check.kind === "result";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="flex flex-col gap-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="verify-clip"
            className="text-sm font-medium text-zinc-200"
          >
            1. Which stamped clip?
          </label>
          <Select
            items={clipLabels}
            value={clipId}
            onValueChange={(value) => {
              if (typeof value === "string") setClipId(value);
              // Same file, different stamp: keep the hash, drop the old verdict.
              setCheck((current) =>
                current.kind === "result"
                  ? { kind: "ready", sha256: current.sha256 }
                  : current,
              );
            }}
          >
            <SelectTrigger
              id="verify-clip"
              className="h-11 w-full rounded-xl border-zinc-700 bg-zinc-950/60 px-3.5 font-mono text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border border-zinc-700 bg-zinc-900">
              {clips.map((candidate) => (
                <SelectItem
                  key={candidate.id}
                  value={candidate.id}
                  className="min-h-10 cursor-pointer px-2.5 font-mono text-sm"
                >
                  {candidate.filename}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500">
            Stamped {formatStampDateTime(clip.stampedAt)} at {clip.siteName}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-zinc-200">
            2. The file you want to check
          </p>
          <FileDrop
            file={file}
            isHashing={check.kind === "hashing"}
            onFile={(next) => void chooseFile(next)}
          />
          <p className="text-xs text-zinc-500">
            Hashed in this browser with SHA-256. The file is never uploaded.
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => void verify()}
          disabled={!canVerify}
          className="w-full"
        >
          {check.kind === "verifying" ? (
            <LoaderCircle className="animate-spin" aria-hidden />
          ) : (
            <FileCheck aria-hidden />
          )}
          {check.kind === "verifying" ? "Checking the stamp" : "Verify"}
        </Button>
      </section>

      <section aria-live="polite" aria-label="Verification result">
        <VerifyResult check={check} />
      </section>
    </div>
  );
}

function FileDrop({
  file,
  isHashing,
  onFile,
}: {
  file: File | null;
  isHashing: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex min-h-28 w-full cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed px-4 py-5 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500",
          isDragging
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-zinc-700 bg-zinc-950/40 hover:border-zinc-500",
        )}
      >
        <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-400 ring-1 ring-indigo-500/20">
          {isHashing ? (
            <LoaderCircle className="size-6 animate-spin" aria-hidden />
          ) : (
            <FileVideoCamera className="size-6" aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-100">
            {file ? file.name : "Drop the original video here"}
          </p>
          <p className="text-xs text-zinc-500">
            {isHashing
              ? "Hashing"
              : file
                ? "Choose a different file"
                : "or click to choose a file"}
          </p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          event.target.value = "";
          if (chosen) onFile(chosen);
        }}
      />
    </>
  );
}

function VerifyResult({ check }: { check: Check }) {
  const shouldReduceMotion = useReducedMotion();

  if (check.kind === "error") {
    return (
      <div
        role="alert"
        className="flex h-full min-h-64 flex-col items-start justify-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6"
      >
        <CircleAlert className="size-6 text-rose-400" aria-hidden />
        <p className="text-sm leading-relaxed text-rose-100">{check.message}</p>
      </div>
    );
  }

  if (check.kind !== "result") {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-800 p-6 text-center">
        <ShieldCheck className="size-8 text-zinc-600" aria-hidden />
        <p className="max-w-xs text-sm leading-relaxed text-zinc-500">
          {check.kind === "idle" || check.kind === "hashing"
            ? "Pick a clip and its file. The answer shows up here: intact, or tampered since the stamp."
            : check.kind === "ready"
              ? "File hashed. Press Verify to compare it with the stamp."
              : "Comparing with the signed stamp"}
        </p>
      </div>
    );
  }

  const { result, sha256 } = check;
  const isIntact = result.status === "intact";
  const Icon = isIntact ? ShieldCheck : ShieldAlert;

  return (
    <motion.div
      key={`${result.status}-${sha256}`}
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex h-full min-h-64 flex-col justify-between gap-6 rounded-2xl border p-6 sm:p-8",
        isIntact
          ? "border-emerald-500/30 bg-gradient-to-b from-emerald-500/15 to-zinc-900"
          : "border-rose-500/30 bg-gradient-to-b from-rose-500/15 to-zinc-900",
      )}
    >
      <div className="flex flex-col gap-4">
        <div
          className={cn(
            "w-fit rounded-2xl p-3",
            isIntact
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-rose-500/15 text-rose-300",
          )}
        >
          <Icon className="size-8" aria-hidden />
        </div>
        <p
          className={cn(
            "text-5xl font-bold tracking-tight md:text-6xl",
            isIntact ? "text-emerald-200" : "text-rose-200",
          )}
        >
          {isIntact ? "Intact" : "Tampered"}
        </p>
        <p className="text-base leading-relaxed text-zinc-300">
          {isIntact
            ? `Hash matches the stamp from ${formatStampTime(result.stampedAt)}. Not one byte has changed since upload.`
            : `Hash does not match the stamp from ${formatStampTime(result.stampedAt)}. This file was changed after upload.`}
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-zinc-950/50 p-4 font-mono text-xs sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-zinc-500">Stamped at upload</dt>
          <dd className="text-zinc-200">{result.stampedSha256Prefix}…</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-zinc-500">This file</dt>
          <dd className={isIntact ? "text-emerald-300" : "text-rose-300"}>
            {sha256.slice(0, 12)}…
          </dd>
        </div>
      </dl>
    </motion.div>
  );
}

export function VerifySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-busy="true">
      <span className="sr-only">Loading clips</span>
      <Skeleton className="h-96 rounded-2xl bg-zinc-900" />
      <Skeleton className="h-96 rounded-2xl bg-zinc-900" />
    </div>
  );
}
