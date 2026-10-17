import type { AnalyzeOutput } from "./contracts";
import type { GenerateOutput } from "./schemas";

export interface FallbackResult<T> {
  data: T;
  isFallback: boolean;
}

export const GENERATE_FALLBACK: GenerateOutput = {
  title: "Summary unavailable right now",
  summary:
    "We couldn't generate a summary this time. Try again in a moment, or shorten the text.",
  tags: [],
};

// No events, with isFallback set. The clip stays stored and blurred, and the UI
// shows "Analysis unavailable, review manually".
export const ANALYZE_FALLBACK: AnalyzeOutput = { events: [] };

// Any thrown error becomes the fallback, so callers never see a raw error.
export async function withFallback<T>(
  label: string,
  fallback: T,
  run: () => Promise<T>,
): Promise<FallbackResult<T>> {
  try {
    return { data: await run(), isFallback: false };
  } catch (error) {
    const reason =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
    console.error(`[${label}] returned fallback. ${reason}`);
    return { data: fallback, isFallback: true };
  }
}
