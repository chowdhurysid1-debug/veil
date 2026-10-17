import { anthropic } from "@ai-sdk/anthropic";

// Pinned on purpose. Never swap this for a "latest" alias.
export const MODEL_ID = "claude-sonnet-5-5";

export const MAX_OUTPUT_TOKENS = 500;
export const MODEL_TIMEOUT_MS = 20_000;

// Clip analysis: up to 10 events with short descriptions, over as many as 20 frames.
export const ANALYZE_MAX_OUTPUT_TOKENS = 1200;
export const ANALYZE_TIMEOUT_MS = 45_000;
export const DAILY_ANALYZE_CAP = 100;

export const model = anthropic(MODEL_ID);
