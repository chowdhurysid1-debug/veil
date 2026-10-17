import type { AnalyzeResponse } from "../contracts";
import type { LabeledEvent } from "./types";

export function summarizeLabels(
  labels: LabeledEvent[],
): AnalyzeResponse["learnedFrom"] {
  return {
    labels: labels.length,
    sites: new Set(labels.map((label) => label.siteId)).size,
  };
}
