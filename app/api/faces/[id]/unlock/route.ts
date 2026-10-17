import { runHandler } from "@/lib/server/deps";
import { unlockFace } from "@/lib/server/handlers/unlock";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return runHandler("unlockFace", (deps) => unlockFace(request, id, deps));
}
