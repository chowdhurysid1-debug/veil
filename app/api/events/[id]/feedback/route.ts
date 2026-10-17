import { runHandler } from "@/lib/server/deps";
import { submitFeedback } from "@/lib/server/handlers/learning";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return runHandler("submitFeedback", (deps) =>
    submitFeedback(request, id, deps),
  );
}
