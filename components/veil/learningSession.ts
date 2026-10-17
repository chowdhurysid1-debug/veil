"use client";

import { useSyncExternalStore } from "react";

// Labels saved in this browser session, so screens can say
// "learned from 1 new label" without another round trip.
let labelsThisSession = 0;
const listeners = new Set<() => void>();

export function recordLearnedLabel(): number {
  labelsThisSession += 1;
  listeners.forEach((listener) => listener());
  return labelsThisSession;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSessionLabelCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => labelsThisSession,
    () => 0,
  );
}
