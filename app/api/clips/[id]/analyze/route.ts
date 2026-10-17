import { runHandler } from "@/lib/server/deps";
import { analyzeClip } from "@/lib/server/handlers/analyze";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return runHandler("analyzeClip", (deps) => analyzeClip(id, deps));
}
