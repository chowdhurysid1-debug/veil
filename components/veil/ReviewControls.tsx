import { CircleCheck, LoaderCircle, ShieldCheck, Siren } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { FeedbackLabel } from "@/lib/contracts";

interface ReviewControlsProps {
  label: FeedbackLabel | null;
  isSaving: boolean;
  onLabel: (label: FeedbackLabel) => void;
}

export function ReviewControls({
  label,
  isSaving,
  onLabel,
}: ReviewControlsProps) {
  if (label && isSaving) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-300">
        <LoaderCircle
          className="size-4 shrink-0 animate-spin text-indigo-400"
          aria-hidden
        />
        Saving in a moment. Undo from the notice if that was a mistake.
      </p>
    );
  }

  if (label) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-200">
        <CircleCheck className="size-4 shrink-0 text-emerald-400" aria-hidden />
        Label saved. Detection at every site learns from it.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-zinc-400">
        Was this a real incident?
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => onLabel("real")}
          className="hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-100"
        >
          <Siren aria-hidden />
          Real
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => onLabel("false_alarm")}
          className="hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-100"
        >
          <ShieldCheck aria-hidden />
          False alarm
        </Button>
      </div>
    </div>
  );
}
