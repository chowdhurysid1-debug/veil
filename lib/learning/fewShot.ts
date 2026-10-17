import { eventTypeSchema } from "../contracts";
import type { LabeledEvent, ReviewedExample } from "./types";

// Per type, the newest false alarms matter most: they are what the model must stop repeating.
export const FALSE_ALARMS_PER_TYPE = 3;
export const REAL_PER_TYPE = 2;
export const MAX_EXAMPLES = 20;

function toExample(label: LabeledEvent): ReviewedExample {
  return {
    eventType: label.eventType,
    label: label.label,
    description: label.description,
    note: label.note,
  };
}

// Newest labels first for each event type, from every site, grouped by type.
export function selectExamples(labels: LabeledEvent[]): ReviewedExample[] {
  const newestFirst = [...labels].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  const examples = eventTypeSchema.options.flatMap((type) => {
    const ofType = newestFirst.filter((label) => label.eventType === type);
    return [
      ...ofType
        .filter((label) => label.label === "false_alarm")
        .slice(0, FALSE_ALARMS_PER_TYPE),
      ...ofType
        .filter((label) => label.label === "real")
        .slice(0, REAL_PER_TYPE),
    ];
  });

  return examples.slice(0, MAX_EXAMPLES).map(toExample);
}
