import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { FeedbackLabel } from "@/lib/contracts";

import { FEEDBACK_LABELS } from "./format";

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
      <p className="label-mono flex items-center gap-2 border border-hairline px-3 py-3 text-ink-muted">
        <LoaderCircle
          className="size-3.5 shrink-0 animate-spin text-signal"
          aria-hidden
        />
        Marked {FEEDBACK_LABELS[label]}. Undo from the notice.
      </p>
    );
  }

  if (label) {
    return (
      <p className="label-mono border border-hairline px-3 py-3 text-ink">
        Decision logged: {FEEDBACK_LABELS[label]}. Every site learns from it.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="label-mono">Was this real?</p>
      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" onClick={() => onLabel("real")}>
          Real
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => onLabel("false_alarm")}
        >
          False alarm
        </Button>
      </div>
    </div>
  );
}
