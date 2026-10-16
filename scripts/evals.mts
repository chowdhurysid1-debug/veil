import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { generateSummary } from "../lib/generate";
import { generateInputSchema, MAX_INPUT_CHARS } from "../lib/schemas";

const evalCaseSchema = z.object({
  id: z.string(),
  input: z.unknown(),
  expect: z.enum(["ok", "rejected"]),
});

const envPath = resolve(".env.local");
if (existsSync(envPath)) process.loadEnvFile(envPath);

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "ANTHROPIC_API_KEY is not set. Add it to .env.local, then rerun npm run evals.",
  );
  process.exit(1);
}

const rawCases: unknown = JSON.parse(
  readFileSync(resolve("evals/demo-inputs.json"), "utf8"),
);
const cases = z.array(evalCaseSchema).parse(rawCases);

// Built here, not stored in the JSON, so the file stays readable.
cases.push({
  id: "oversized-text",
  input: { text: "a".repeat(MAX_INPUT_CHARS + 1) },
  expect: "rejected",
});

interface Row {
  id: string;
  expected: string;
  result: string;
  isFallback: boolean | "-";
  ms: number;
  isPass: boolean;
}

async function runCase({
  id,
  input,
  expect,
}: z.infer<typeof evalCaseSchema>): Promise<Row> {
  const startedAt = performance.now();
  const parsed = generateInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      id,
      expected: expect,
      result: "rejected",
      isFallback: "-",
      ms: 0,
      isPass: expect === "rejected",
    };
  }

  const { isFallback } = await generateSummary(parsed.data);
  const ms = Math.round(performance.now() - startedAt);
  return {
    id,
    expected: expect,
    result: isFallback ? "fallback" : "ok",
    isFallback,
    ms,
    isPass: expect === "ok" && !isFallback,
  };
}

const rows = await Promise.all(cases.map(runCase));

console.table(
  rows.map(({ isPass, ...row }) => ({
    pass: isPass ? "PASS" : "FAIL",
    ...row,
  })),
);

const failed = rows.filter((row) => !row.isPass).length;
console.log(
  failed === 0
    ? `All ${rows.length} cases passed.`
    : `${failed} of ${rows.length} cases failed.`,
);
process.exit(failed === 0 ? 0 : 1);
