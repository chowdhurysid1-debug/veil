import { generateText, Output, type LanguageModel } from "ai";

import {
  MAX_OUTPUT_TOKENS,
  model as defaultModel,
  MODEL_TIMEOUT_MS,
} from "./ai";
import {
  GENERATE_FALLBACK,
  withFallback,
  type FallbackResult,
} from "./fallbacks";
import {
  generateOutputSchema,
  type GenerateInput,
  type GenerateOutput,
} from "./schemas";

const SYSTEM_PROMPT =
  "Summarize the user's text. Return a short title, a summary of at most three sentences, and up to five lowercase topic tags.";

interface GenerateOptions {
  model?: LanguageModel;
  timeoutMs?: number;
  maxRetries?: number;
}

export function generateSummary(
  input: GenerateInput,
  {
    model = defaultModel,
    timeoutMs = MODEL_TIMEOUT_MS,
    maxRetries = 1,
  }: GenerateOptions = {},
): Promise<FallbackResult<GenerateOutput>> {
  return withFallback("generateSummary", GENERATE_FALLBACK, async () => {
    const { output } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: input.text,
      output: Output.object({ schema: generateOutputSchema }),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      timeout: timeoutMs,
      maxRetries,
    });
    // The SDK validates too, but parse again so this boundary is explicit and typed.
    return generateOutputSchema.parse(output);
  });
}
