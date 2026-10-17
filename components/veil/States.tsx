import type { ComponentType, ReactNode } from "react";
import { CircleAlert, RotateCcw } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl"
        />
        <div className="relative rounded-2xl bg-indigo-500/10 p-3 text-indigo-400 ring-1 ring-indigo-500/20">
          <Icon className="size-7" />
        </div>
      </div>
      <div className="flex max-w-sm flex-col gap-1.5">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  className?: string;
}

export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-400">
        <CircleAlert className="size-5" aria-hidden />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-sm font-semibold text-rose-100">
          This didn&apos;t load
        </p>
        <p className="text-sm leading-relaxed text-rose-200/80">{message}</p>
      </div>
      <Button variant="secondary" size="lg" onClick={onRetry}>
        <RotateCcw aria-hidden />
        Try again
      </Button>
    </div>
  );
}
