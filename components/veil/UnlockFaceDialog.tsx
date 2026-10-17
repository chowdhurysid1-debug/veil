"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  LockKeyholeOpen,
  ScrollText,
  TriangleAlert,
} from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEMO_IDENTITY,
  unlockRequestSchema,
  type UnlockRequest,
} from "@/lib/contracts";

import { veilApi } from "./api";
import { friendlyErrorMessage } from "./errors";
import { REASON_CATEGORY_LABELS, formatClipTime } from "./format";
import type { LockedFaceSummary } from "./FramePlayer";
import { revealFace } from "./revealFace";

export const REVEAL_SECONDS = 30;
const MIN_REASON_CHARS = 15;

type ReasonCategory = UnlockRequest["reasonCategory"];

type Stage =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "revealed"; imageUrl: string; auditId: string }
  | { kind: "relocked"; auditId: string };

interface UnlockFaceDialogProps {
  face: LockedFaceSummary | null;
  tSeconds: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnlockFaceDialog({
  face,
  tSeconds,
  open,
  onOpenChange,
}: UnlockFaceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 border border-zinc-800 bg-zinc-900 p-6 ring-0 sm:max-w-md">
        {face && (
          <UnlockFlow
            key={face.id}
            face={face}
            tSeconds={tSeconds}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function UnlockFlow({
  face,
  tSeconds,
  onClose,
}: {
  face: LockedFaceSummary;
  tSeconds: number;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>({ kind: "form" });
  const [category, setCategory] = useState<ReasonCategory | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const trimmedLength = reason.trim().length;
  const isSubmitting = stage.kind === "submitting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = unlockRequestSchema.safeParse({
      reasonCategory: category,
      reason,
    });
    if (!parsed.success) {
      setError(
        category === null
          ? "Pick why you need to see this face."
          : (parsed.error.issues[0]?.message ?? "Add a reason."),
      );
      return;
    }
    setError(null);
    setStage({ kind: "submitting" });
    try {
      const unlock = await veilApi.unlockFace(face.id, parsed.data);
      const imageUrl = await revealFace(unlock);
      setStage({ kind: "revealed", imageUrl, auditId: unlock.auditId });
    } catch (unlockError) {
      setError(friendlyErrorMessage(unlockError));
      setStage({ kind: "form" });
    }
  }

  if (stage.kind === "revealed") {
    return (
      <RevealedFace
        imageUrl={stage.imageUrl}
        auditId={stage.auditId}
        onExpire={() => setStage({ kind: "relocked", auditId: stage.auditId })}
        onLockNow={onClose}
      />
    );
  }

  if (stage.kind === "relocked") {
    return (
      <>
        <DialogHeader>
          <div className="mb-1 w-fit rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
            <LockKeyhole className="size-5" aria-hidden />
          </div>
          <DialogTitle className="text-lg font-semibold text-white">
            Face locked again
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-zinc-400">
            The key is gone from this browser. Your unlock stays in the audit
            log as entry {shortId(stage.auditId)}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link
            href="/audit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-zinc-300 transition-all duration-200 hover:bg-white/5 hover:text-white"
          >
            <ScrollText className="size-4" aria-hidden />
            Open audit log
          </Link>
          <Button size="lg" onClick={onClose}>
            Done
          </Button>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <DialogHeader>
        <div className="mb-1 w-fit rounded-xl bg-amber-500/10 p-2.5 text-amber-400">
          <LockKeyholeOpen className="size-5" aria-hidden />
        </div>
        <DialogTitle className="text-lg font-semibold text-white">
          Unlock the face at {formatClipTime(tSeconds)}?
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-zinc-400">
          It decrypts in this browser for {REVEAL_SECONDS} seconds, then locks
          again.
        </DialogDescription>
      </DialogHeader>

      <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <TriangleAlert
          className="mt-0.5 size-4 shrink-0 text-amber-400"
          aria-hidden
        />
        <p className="text-sm leading-relaxed text-amber-100/90">
          This shows a real person. Your name ({DEMO_IDENTITY.actor}), your
          reason, and the time go into the audit log before the key is released.
          Veil has no way to edit or remove that entry.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="unlock-category"
          className="text-sm font-medium text-zinc-200"
        >
          Why do you need to see it?
        </label>
        <Select
          items={REASON_CATEGORY_LABELS}
          value={category}
          onValueChange={(value) => {
            setCategory(value as ReasonCategory | null);
            setError(null);
          }}
          disabled={isSubmitting}
        >
          <SelectTrigger
            id="unlock-category"
            className="h-11 w-full rounded-xl border-zinc-700 bg-zinc-950/60 px-3.5 text-sm"
          >
            <SelectValue placeholder="Choose a reason" />
          </SelectTrigger>
          <SelectContent className="border border-zinc-700 bg-zinc-900">
            {Object.entries(REASON_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem
                key={value}
                value={value}
                className="min-h-10 cursor-pointer px-2.5 text-sm"
              >
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="unlock-reason"
          className="text-sm font-medium text-zinc-200"
        >
          Written reason
        </label>
        <Textarea
          id="unlock-reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError(null);
          }}
          disabled={isSubmitting}
          maxLength={500}
          rows={3}
          placeholder="For example: confirm which student fell so the nurse can follow up."
          aria-describedby="unlock-reason-count"
          className="min-h-24 resize-none rounded-xl border-zinc-700 bg-zinc-950/60 px-3.5 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        <p
          id="unlock-reason-count"
          className={cn(
            "text-xs tabular-nums",
            trimmedLength >= MIN_REASON_CHARS
              ? "text-emerald-400"
              : "text-zinc-500",
          )}
        >
          {trimmedLength >= MIN_REASON_CHARS
            ? "Enough detail for the log"
            : `${MIN_REASON_CHARS - trimmedLength} more characters needed`}
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-3 text-sm text-rose-200"
        >
          <CircleAlert
            className="mt-0.5 size-4 shrink-0 text-rose-400"
            aria-hidden
          />
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Keep it locked
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || category === null || trimmedLength === 0}
        >
          {isSubmitting ? (
            <LoaderCircle className="animate-spin" aria-hidden />
          ) : (
            <LockKeyholeOpen aria-hidden />
          )}
          {isSubmitting ? "Logging and unlocking" : "Log reason and unlock"}
        </Button>
      </div>
    </form>
  );
}

function RevealedFace({
  imageUrl,
  auditId,
  onExpire,
  onLockNow,
}: {
  imageUrl: string;
  auditId: string;
  onExpire: () => void;
  onLockNow: () => void;
}) {
  const [remaining, setRemaining] = useState(REVEAL_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (remaining === 0) onExpire();
  }, [remaining, onExpire]);

  const progress = remaining / REVEAL_SECONDS;
  const circumference = 2 * Math.PI * 18;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-white">
          Face unlocked
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-zinc-400">
          Logged as audit entry {shortId(auditId)}. It locks again on its own.
        </DialogDescription>
      </DialogHeader>
      <div className="relative mx-auto aspect-square w-48 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
        <Image
          src={imageUrl}
          alt="Decrypted face crop"
          fill
          unoptimized
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-zinc-950/80 to-transparent" />
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
        <svg
          viewBox="0 0 44 44"
          className="size-11 shrink-0 -rotate-90"
          aria-hidden
        >
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="#27272a"
            strokeWidth="4"
          />
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="#818cf8"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <p className="flex-1 text-sm text-zinc-300" aria-live="off">
          Locks again in{" "}
          <span className="font-semibold text-white tabular-nums">
            {remaining}s
          </span>
        </p>
        <Button variant="secondary" size="lg" onClick={onLockNow}>
          <LockKeyhole aria-hidden />
          Lock now
        </Button>
      </div>
    </>
  );
}

function shortId(id: string) {
  return id.slice(0, 8);
}
