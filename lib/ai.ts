import { anthropic } from "@ai-sdk/anthropic";

// Pinned on purpose. Never swap this for a "latest" alias.
export const MODEL_ID = "claude-opus-5-5";

export const MAX_OUTPUT_TOKENS = 500;
export const MODEL_TIMEOUT_MS = 20_000;

export const model = anthropic(MODEL_ID);
