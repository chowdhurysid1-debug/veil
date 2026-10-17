"use client";

import { useSyncExternalStore } from "react";

import type { EventType, FeedbackLabel } from "@/lib/contracts";

// Labels saved in this browser session, so screens can say
// "learned from 1 new label" without another round trip.
let labelsThisSession = 0;

/** The most recent label saved in this session and what it moved. */
export interface LearningUpdate {
  eventType: EventType;
  label: FeedbackLabel;
  thresholdBefore: number | null;
  thresholdAfter: number | null;
  at: string;
}

let lastUpdate: LearningUpdate | null = null;
const listeners = new Set<() => void>();

export function recordLearnedLabel(update?: LearningUpdate): number {
  labelsThisSession += 1;
  if (update) lastUpdate = update;
  listeners.forEach((listener) => listener());
  return labelsThisSession;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionLabelCount(): number {
  return labelsThisSession;
}

export function useSessionLabelCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => labelsThisSession,
    () => 0,
  );
}

export function useLastLearningUpdate(): LearningUpdate | null {
  return useSyncExternalStore(
    subscribe,
    () => lastUpdate,
    () => null,
  );
}
