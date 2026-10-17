/** An error whose message is safe to show the officer as-is. */
export class VeilApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VeilApiError";
  }
}

// Tab A's PipelineError (lib/video) also carries user-facing copy. Matched by
// name so this file stays importable without loading MediaPipe.
const SAFE_ERROR_NAMES = new Set(["VeilApiError", "PipelineError"]);

const GENERIC_ERROR =
  "Something went wrong on our side. Try again in a moment.";

export function friendlyErrorMessage(error: unknown): string {
  return error instanceof Error && SAFE_ERROR_NAMES.has(error.name)
    ? error.message
    : GENERIC_ERROR;
}
