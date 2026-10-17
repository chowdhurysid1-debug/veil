import { z } from "zod";

export const MAX_JSON_BYTES = 16 * 1024;
// Vercel rejects request bodies over 4.5 MB, so refuse a little earlier with a clear message.
export const MAX_CLIP_REQUEST_BYTES = 4_400_000;

// Responses can carry face keys or signed URLs, so nothing is cached anywhere.
const NO_STORE = { "Cache-Control": "no-store" };

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function errorResponse(status: number, message: string): Response {
  return json({ error: message }, status);
}

// Stops reading as soon as the body passes maxBytes, so an oversized upload is never buffered whole.
async function readTextWithLimit(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

type JsonBody = { ok: true; body: unknown } | { ok: false; response: Response };

export async function readJson(
  request: Request,
  maxBytes: number,
  tooLargeMessage = "This request is too large.",
): Promise<JsonBody> {
  const header = request.headers.get("content-length");
  if (header !== null && !/^\d+$/.test(header)) {
    return {
      ok: false,
      response: errorResponse(400, "The Content-Length header is invalid."),
    };
  }
  if (header !== null && Number(header) > maxBytes) {
    return { ok: false, response: errorResponse(413, tooLargeMessage) };
  }

  const text = await readTextWithLimit(request, maxBytes);
  if (text === null) {
    return { ok: false, response: errorResponse(413, tooLargeMessage) };
  }

  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      response: errorResponse(400, "Send a JSON request body."),
    };
  }
}

export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input.";
  return issue.path.length > 0
    ? `${issue.path.join(".")}: ${issue.message}`
    : issue.message;
}

export function parseUuid(value: string): string | null {
  const parsed = z.uuid().safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function describeError(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}
