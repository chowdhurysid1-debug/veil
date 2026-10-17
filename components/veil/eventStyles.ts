import {
  CircleQuestionMark,
  Flame,
  PersonStanding,
  ShoppingBag,
  Swords,
  type LucideIcon,
} from "lucide-react";

import type { ClipEvent, EventType } from "@/lib/contracts";

export const EVENT_ICONS: Record<EventType, LucideIcon> = {
  fall: PersonStanding,
  fight: Swords,
  theft: ShoppingBag,
  fire: Flame,
  other: CircleQuestionMark,
};

export type EventStatus = "flagged" | "below" | "real" | "false_alarm";

export function eventStatus(event: ClipEvent): EventStatus {
  if (event.label) return event.label;
  return event.flagged ? "flagged" : "below";
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  flagged: "Needs review",
  below: "Not flagged",
  real: "Confirmed real",
  false_alarm: "False alarm",
};

/** Tag classes per status. Signal = needs a human; everything settled is monochrome. */
export const EVENT_STATUS_CLASSES: Record<EventStatus, string> = {
  flagged: "border-signal/60 text-signal",
  below: "border-hairline-strong text-ink-dim",
  real: "border-ink text-ink",
  false_alarm: "border-hairline-strong text-ink-muted",
};

/** Timeline marker colors per status. */
export const EVENT_MARKER_CLASSES: Record<EventStatus, string> = {
  flagged: "bg-signal",
  below: "bg-ink-dim",
  real: "bg-ink",
  false_alarm: "border border-ink-muted bg-void",
};
