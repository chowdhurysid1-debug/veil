import { connection } from "next/server";

import { runHandler } from "@/lib/server/deps";
import { getLearningStats } from "@/lib/server/handlers/learning";

export async function GET() {
  await connection();
  return runHandler("getLearningStats", getLearningStats);
}
