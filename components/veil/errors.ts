/** An error whose message is safe to show the officer as-is. */
export class VeilApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VeilApiError";
  }
}

const GENERIC_ERROR =
  "Something went wrong on our side. Try again in a moment.";

export function friendlyErrorMessage(error: unknown): string {
  return error instanceof VeilApiError ? error.message : GENERIC_ERROR;
}
