import type { EventType, FeedbackLabel } from "../contracts";

// One human review of one detected event, joined with what the model said and where it happened.
export interface LabeledEvent {
  eventId: string;
  eventType: EventType;
  description: string;
  label: FeedbackLabel;
  note: string | null;
  siteId: string;
  siteName: string;
  createdAt: string;
}

// What the model sees of a past label: no ids, no timestamps.
export type ReviewedExample = Pick<
  LabeledEvent,
  "eventType" | "label" | "description" | "note" | "siteName"
>;
