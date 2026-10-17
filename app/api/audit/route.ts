import { connection } from "next/server";

import { runHandler } from "@/lib/server/deps";
import { listAudit } from "@/lib/server/handlers/unlock";

export async function GET() {
  await connection();
  return runHandler("listAudit", listAudit);
}
