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

/** Pill classes per status. Amber = needs a human, rose = real incident. */
export const EVENT_STATUS_CLASSES: Record<EventStatus, string> = {
  flagged: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  below: "border-zinc-700 bg-zinc-800/60 text-zinc-400",
  real: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  false_alarm: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

/** Timeline marker colors per status. */
export const EVENT_MARKER_CLASSES: Record<EventStatus, string> = {
  flagged: "bg-amber-400 ring-amber-400/30",
  below: "bg-zinc-500 ring-zinc-500/20",
  real: "bg-rose-400 ring-rose-400/30",
  false_alarm: "bg-emerald-400 ring-emerald-400/30",
};
