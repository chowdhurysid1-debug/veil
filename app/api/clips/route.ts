import { connection } from "next/server";

import { runHandler } from "@/lib/server/deps";
import { createClip, listClips } from "@/lib/server/handlers/clips";

export async function GET() {
  // Always read live data; never prerender this list at build time.
  await connection();
  return runHandler("listClips", listClips);
}

export async function POST(request: Request) {
  return runHandler("createClip", (deps) => createClip(request, deps));
}
