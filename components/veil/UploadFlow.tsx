"use client";

import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheck,
  CloudUpload,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Stamp,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "cn";

import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type {
  AnalyzeResponse,
  ClipEvent,
  PipelineProgress,
  ProcessedFrame,
} from "@/lib/contracts";
import { MOCK_SITES } from "@/lib/mock";

import { veilApi } from "./api";
import { CountUp } from "./CountUp";
import { friendlyErrorMessage } from "./errors";
import {
  eventHeadline,
  formatConfidence,
  formatStampTime,
  pluralize,
} from "./format";
import { FrameImage, frameDataUrl } from "./FrameImage";
import { processClip, rejectFile } from "./pipeline";

const DEMO_SITE_ID = MOCK_SITES[0].id;

const STEPS = [
  {
    label: "Extract frames",
    detail: "Up to 20 frames, 640px wide, sampled in this browser.",
  },
  {
    label: "Find and blur faces",
    detail: "Every face is blurred before a single byte leaves this device.",
  },
  {
    label: "Encrypt face crops",
    detail: "AES-GCM with a fresh key for every face.",
  },
  {
    label: "Stamp footage",
    detail: "SHA-256 of the original file, signed by the server on upload.",
  },
  {
    label: "Analyze blurred frames",
    detail: "The AI only ever sees blurred frames.",
  },
] as const;

const STAMP_STEP = 3;
const ANALYZE_STEP = 4;

const PIPELINE_STEP_INDEX: Record<PipelineProgress["step"], number> = {
  frames: 0,
  faces: 1,
  blur: 1,
  encrypt: 2,
  hash: STAMP_STEP,
  done: STAMP_STEP,
};

type Phase =
  | { kind: "idle"; rejection: string | null }
  | {
      kind: "running";
      file: File;
      activeStep: number;
      stepProgress: number;
      message: string;
      facesLocked: number | null;
    }
  | {
      kind: "done";
      file: File;
      clipId: string;
      facesLocked: number;
      stampedAt: string;
      frames: ProcessedFrame[];
      analysis: AnalyzeResponse | null;
    }
  | {
      kind: "error";
      file: File;
      failedStep: number;
      facesLocked: number | null;
      message: string;
    };

export function UploadFlow() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle", rejection: null });

  async function run(file: File) {
    const rejection = rejectFile(file);
    if (rejection) {
      setPhase({ kind: "idle", rejection });
      return;
    }

    let activeStep = 0;
    let facesLocked: number | null = null;
    setPhase({
      kind: "running",
      file,
      activeStep,
      stepProgress: 0,
      message: "Reading the video",
      facesLocked,
    });

    try {
      const processed = await processClip(file, (progress) => {
        activeStep = PIPELINE_STEP_INDEX[progress.step];
        setPhase({
          kind: "running",
          file,
          activeStep,
          stepProgress: progress.progress,
          message: progress.message,
          facesLocked,
        });
      });

      facesLocked = processed.faces.length;
      activeStep = STAMP_STEP;
      setPhase({
        kind: "running",
        file,
        activeStep,
        stepProgress: 0.6,
        message: "Uploading blurred frames and sealed faces",
        facesLocked,
      });
      const created = await veilApi.createClip({
        ...processed,
        siteId: DEMO_SITE_ID,
      });

      activeStep = ANALYZE_STEP;
      setPhase({
        kind: "running",
        file,
        activeStep,
        stepProgress: 0.3,
        message: "Checking against labels from every site",
        facesLocked,
      });
      // The clip is already stored and blurred. If analysis fails, the officer
      // reviews it manually; the upload still counts as done.
      const analysis = await veilApi
        .analyzeClip(created.clipId)
        .catch(() => null);

      setPhase({
        kind: "done",
        file,
        clipId: created.clipId,
        facesLocked: created.facesLocked,
        stampedAt: created.stampedAt,
        frames: processed.frames,
        analysis,
      });
    } catch (error) {
      setPhase({
        kind: "error",
        file,
        failedStep: activeStep,
        facesLocked,
        message: friendlyErrorMessage(error),
      });
    }
  }

  function reset() {
    setPhase({ kind: "idle", rejection: null });
  }

  if (phase.kind === "idle") {
    return (
      <DropZone rejection={phase.rejection} onFile={(file) => void run(file)} />
    );
  }

  if (phase.kind === "done") {
    return <UploadDone phase={phase} onReset={reset} />;
  }

  const isError = phase.kind === "error";
  const activeStep = isError ? phase.failedStep : phase.activeStep;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section
        aria-label="Upload progress"
        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"
      >
        <FileHeading file={phase.file} />
        <ol className="mt-6 flex flex-col gap-1" aria-live="polite">
          {STEPS.map((step, index) => (
            <StepRow
              key={step.label}
              index={index}
              label={step.label}
              detail={step.detail}
              status={
                index < activeStep
                  ? "done"
                  : index > activeStep
                    ? "pending"
                    : isError
                      ? "failed"
                      : "active"
              }
              progress={phase.kind === "running" ? phase.stepProgress : 0}
              message={phase.kind === "running" ? phase.message : null}
            />
          ))}
        </ol>

        {isError && (
          <div
            role="alert"
            className="mt-6 flex flex-col gap-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 sm:flex-row sm:items-center"
          >
            <CircleAlert
              className="size-5 shrink-0 text-rose-400"
              aria-hidden
            />
            <p className="flex-1 text-sm leading-relaxed text-rose-100">
              {phase.message}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="lg" onClick={reset}>
                Choose another
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => void run(phase.file)}
              >
                <RotateCcw aria-hidden />
                Try again
              </Button>
            </div>
          </div>
        )}
      </section>

      <FacesCounter facesLocked={phase.facesLocked} />
    </div>
  );
}

function DropZone({
  rejection,
  onFile,
}: {
  rejection: string | null;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div className="flex flex-col gap-6">
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
          "group relative flex min-h-80 w-full cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-12 text-center outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500",
          isDragging
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12),transparent_60%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
        <div className="relative rounded-2xl bg-indigo-500/10 p-4 text-indigo-400 ring-1 ring-indigo-500/20">
          <CloudUpload className="size-8" aria-hidden />
        </div>
        <div className="relative flex flex-col gap-2">
          <span className="text-lg font-semibold text-white">
            Drop a 20 to 30 second clip
          </span>
          <span className="text-sm text-zinc-400">
            or{" "}
            <span className="font-medium text-indigo-300 underline-offset-4 group-hover:underline">
              choose a video file
            </span>
            . MP4, MOV, or WebM up to 200 MB.
          </span>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />

      {rejection && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-200"
        >
          <CircleAlert className="size-4 shrink-0 text-rose-400" aria-hidden />
          {rejection}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: EyeOff,
            text: "Faces are blurred in this browser, before upload.",
          },
          {
            icon: LockKeyhole,
            text: "Face crops are encrypted. Unlocking one needs a reason.",
          },
          {
            icon: Stamp,
            text: "The original file is stamped so later edits show up.",
          },
        ].map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm leading-relaxed text-zinc-400"
          >
            <Icon
              className="mt-0.5 size-4 shrink-0 text-indigo-400"
              aria-hidden
            />
            {text}
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500">
        Use footage you have the rights to. Demo clips should use actors, never
        real students.
      </p>
    </div>
  );
}

function FileHeading({ file }: { file: File }) {
  const megabytes = file.size / (1024 * 1024);
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-zinc-800 p-2.5 text-zinc-300">
        <CloudUpload className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-medium text-zinc-100">
          {file.name}
        </p>
        <p className="text-xs text-zinc-500">
          {megabytes < 1 ? "<1" : megabytes.toFixed(1)} MB
        </p>
      </div>
    </div>
  );
}

type StepStatus = "done" | "active" | "pending" | "failed";

interface StepRowProps {
  index: number;
  label: string;
  detail: string;
  status: StepStatus;
  progress: number;
  message: string | null;
}

function StepRow({
  index,
  label,
  detail,
  status,
  progress,
  message,
}: StepRowProps) {
  return (
    <li
      aria-current={status === "active" ? "step" : undefined}
      className={cn(
        "flex gap-4 rounded-xl p-3 transition-all duration-200",
        status === "active" && "bg-indigo-500/5 ring-1 ring-indigo-500/20",
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
          status === "done" && "bg-emerald-500/15 text-emerald-400",
          status === "active" && "bg-indigo-500/15 text-indigo-300",
          status === "pending" && "bg-zinc-800 text-zinc-500",
          status === "failed" && "bg-rose-500/15 text-rose-400",
        )}
      >
        {status === "done" && <Check className="size-4" aria-hidden />}
        {status === "active" && (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        )}
        {status === "pending" && index + 1}
        {status === "failed" && <X className="size-4" aria-hidden />}
        <span className="sr-only">{status}</span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
        <p
          className={cn(
            "text-sm font-medium",
            status === "pending" ? "text-zinc-500" : "text-zinc-100",
          )}
        >
          {label}
        </p>
        <p className="text-xs leading-relaxed text-zinc-500">
          {status === "active" && message ? (
            <span className="text-indigo-300">{message}</span>
          ) : (
            detail
          )}
        </p>
        {status === "active" && (
          <Progress
            value={Math.round(progress * 100)}
            aria-label={`${label} progress`}
            className="mt-2"
          />
        )}
      </div>
    </li>
  );
}

function FacesCounter({ facesLocked }: { facesLocked: number | null }) {
  return (
    <aside
      aria-label="Face privacy"
      className="flex flex-col gap-6 rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/10 to-zinc-900 p-6"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-indigo-300">
        <ShieldCheck className="size-4" aria-hidden />
        Face vault
      </div>
      <div>
        {facesLocked === null ? (
          <p className="h-14 w-16 animate-pulse rounded-lg bg-indigo-500/15" />
        ) : (
          <CountUp
            value={facesLocked}
            className="text-6xl font-bold tracking-tight text-white tabular-nums"
          />
        )}
        <p className="mt-1 text-sm text-zinc-400">
          {facesLocked === null ? "Finding faces" : "faces locked"}
        </p>
      </div>
      <div className="border-t border-indigo-500/10 pt-5">
        <p className="text-4xl font-bold tracking-tight text-emerald-300 tabular-nums">
          0
        </p>
        <p className="mt-1 text-sm text-zinc-400">stored in the clear</p>
      </div>
    </aside>
  );
}

function UploadDone({
  phase,
  onReset,
}: {
  phase: Extract<Phase, { kind: "done" }>;
  onReset: () => void;
}) {
  const { analysis, frames } = phase;
  const timeOf = (event: ClipEvent) =>
    frames.find((frame) => frame.frameIndex === event.frameIndex)?.tSeconds ??
    0;
  const flagged = analysis?.events.filter((event) => event.flagged) ?? [];
  const belowThreshold =
    analysis?.events.filter((event) => !event.flagged) ?? [];
  const highlightFrames = new Set(
    analysis?.events.map((event) => event.frameIndex) ?? [],
  );
  const filmstrip = frames.filter((_, index) => index % 3 === 0).slice(0, 7);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="flex flex-col gap-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-400">
            <CircleCheck className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">
              Stamped at {formatStampTime(phase.stampedAt)}, faces sealed
            </h2>
            <p className="truncate font-mono text-xs text-zinc-500">
              {phase.file.name}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {filmstrip.map((frame) => (
            <div
              key={frame.frameIndex}
              className={cn(
                "aspect-video overflow-hidden rounded-md ring-1",
                highlightFrames.has(frame.frameIndex)
                  ? "ring-amber-400"
                  : "ring-zinc-800",
              )}
            >
              <FrameImage
                src={frameDataUrl(frame.blurredJpegBase64)}
                alt={`Blurred frame ${frame.frameIndex + 1}`}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3" aria-live="polite">
          {analysis === null || analysis.isFallback ? (
            <ResultLine
              tone="amber"
              title="Analysis unavailable, review manually"
              detail="The clip is stored and every face is still blurred. Scrub the timeline to check it yourself."
            />
          ) : (
            <>
              {flagged.map((event) => (
                <ResultLine
                  key={event.id}
                  tone="amber"
                  title={`${eventHeadline(event.type, timeOf(event))}, confidence ${formatConfidence(event.confidence)}`}
                  detail={event.description}
                />
              ))}
              {belowThreshold.map((event) => (
                <ResultLine
                  key={event.id}
                  tone="zinc"
                  title={`Not flagged: ${eventHeadline(event.type, timeOf(event)).toLowerCase()}, confidence ${formatConfidence(event.confidence)}`}
                  detail={`Below the learned ${event.type} threshold of ${formatConfidence(event.threshold)}, set by past false alarms.`}
                />
              ))}
              {analysis.events.length === 0 && (
                <ResultLine
                  tone="emerald"
                  title="Nothing flagged"
                  detail="The AI found no falls, fights, thefts, or fires in the blurred frames."
                />
              )}
              <p className="text-xs text-zinc-500">
                Checked against{" "}
                {pluralize(analysis.learnedFrom.labels, "human label")} from{" "}
                {pluralize(analysis.learnedFrom.sites, "site")}.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-800 pt-5 sm:flex-row">
          <Link
            href={`/clips/${phase.clipId}`}
            className={buttonVariants({ size: "lg" })}
          >
            Review clip
            <ArrowRight aria-hidden />
          </Link>
          <Button variant="ghost" size="lg" onClick={onReset}>
            Upload another
          </Button>
        </div>
      </section>

      <FacesCounter facesLocked={phase.facesLocked} />
    </div>
  );
}

function ResultLine({
  tone,
  title,
  detail,
}: {
  tone: "amber" | "zinc" | "emerald";
  title: string;
  detail: string;
}) {
  const Icon = tone === "emerald" ? CircleCheck : TriangleAlert;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4",
        tone === "amber" && "border-amber-500/20 bg-amber-500/5",
        tone === "zinc" && "border-zinc-800 bg-zinc-950/40",
        tone === "emerald" && "border-emerald-500/20 bg-emerald-500/5",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "amber" && "text-amber-400",
          tone === "zinc" && "text-zinc-500",
          tone === "emerald" && "text-emerald-400",
        )}
        aria-hidden
      />
      <div className="flex flex-col gap-1">
        <p
          className={cn(
            "text-sm font-medium",
            tone === "zinc" ? "text-zinc-300" : "text-white",
          )}
        >
          {title}
        </p>
        <p className="text-sm leading-relaxed text-zinc-400">{detail}</p>
      </div>
    </div>
  );
}
