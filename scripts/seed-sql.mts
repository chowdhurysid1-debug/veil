// Writes supabase/seed.sql from lib/learning/seed.ts.
// Usage: npx tsx scripts/seed-sql.mts           (rewrite the file)
//        npx tsx scripts/seed-sql.mts --check   (exit 1 if the file is out of date)
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildSeedSql } from "../lib/server/seedSql";

const seedPath = resolve("supabase/seed.sql");
const sql = buildSeedSql();

if (process.argv.includes("--check")) {
  const current = readFileSync(seedPath, "utf8");
  if (current !== sql) {
    console.error(
      "supabase/seed.sql is out of date. Run npx tsx scripts/seed-sql.mts.",
    );
    process.exit(1);
  }
  console.log("supabase/seed.sql is up to date.");
} else {
  writeFileSync(seedPath, sql);
  console.log(`Wrote ${seedPath}`);
}
