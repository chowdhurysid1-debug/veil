import { eventTypeSchema, type EventType } from "../contracts";

export type Thresholds = Record<EventType, number>;

// Used for every type until there are labels to learn from.
export const DEFAULT_THRESHOLD = 0.5;

export function uniformThresholds(value = DEFAULT_THRESHOLD): Thresholds {
  return Object.fromEntries(
    eventTypeSchema.options.map((type) => [type, value]),
  ) as Thresholds;
}
