import { DAILY_GENERATE_CAP, generateCallCap } from "@/lib/dailyCap";
import { GENERATE_FALLBACK } from "@/lib/fallbacks";
import { generateSummary } from "@/lib/generate";
import { generateInputSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Send a JSON body like { "text": "..." }.' },
      { status: 400 },
    );
  }

  const parsed = generateInputSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input.";
    return Response.json({ error: message }, { status: 400 });
  }

  if (!generateCallCap.tryConsume()) {
    console.warn(
      `[generate] daily cap of ${DAILY_GENERATE_CAP} calls reached, returning fallback`,
    );
    return Response.json({ data: GENERATE_FALLBACK, isFallback: true });
  }

  // Model and parse failures come back as the fallback, never as a raw error.
  const result = await generateSummary(parsed.data);
  return Response.json(result);
}
