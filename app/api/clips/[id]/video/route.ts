import { connection } from "next/server";

import { runHandler } from "@/lib/server/deps";
import { createVideoUpload } from "@/lib/server/handlers/clips";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  const { id } = await params;
  return runHandler("createVideoUpload", (deps) => createVideoUpload(id, deps));
}
