import { runHandler } from "@/lib/server/deps";
import { verifyClip } from "@/lib/server/handlers/verify";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return runHandler("verifyClip", (deps) => verifyClip(request, id, deps));
}
