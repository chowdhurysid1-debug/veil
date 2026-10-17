import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { MODEL_ID } from "../lib/ai";
import {
  curveScenariosSchema,
  runCurve,
  summarizeRuns,
  type CurveResults,
  type CurveRun,
} from "../lib/learning/curve";
import { analyzeFrames } from "../lib/server/analyzeFrames";

// Usage: npm run evals:learning -- --runs 3
// Every run calls the model about 190 times with text-only frames.
const runsFlag = process.argv.indexOf("--runs");
const runCount = runsFlag === -1 ? 1 : Number(process.argv[runsFlag + 1]);
if (!Number.isInteger(runCount) || runCount < 1 || runCount > 5) {
  console.error("--runs takes a whole number from 1 to 5.");
  process.exit(1);
}

const envPath = resolve(".env.local");
if (existsSync(envPath)) process.loadEnvFile(envPath);
if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "ANTHROPIC_API_KEY is not set. Add it to .env.local, then rerun npm run evals:learning.",
  );
  process.exit(1);
}

const scenarios = curveScenariosSchema.parse(
  JSON.parse(readFileSync(resolve("evals/learning-curve.json"), "utf8")),
);

const runs: CurveRun[] = [];
for (let index = 0; index < runCount; index += 1) {
  const startedAt = performance.now();
  runs.push(
    await runCurve({ scenarios, analyze: analyzeFrames, startedAt: new Date() }),
  );
  console.log(
    `Run ${index + 1} of ${runCount} done in ${Math.round((performance.now() - startedAt) / 1000)}s.`,
  );
}

const results: CurveResults = {
  generatedAt: new Date().toISOString(),
  model: MODEL_ID,
  commit: execSync("git rev-parse --short HEAD").toString().trim(),
  testClips: scenarios.test.length,
  harmlessTestClips: scenarios.test.filter((clip) => clip.truth.length === 0)
    .length,
  realTestEvents: scenarios.test.reduce(
    (sum, clip) => sum + clip.truth.length,
    0,
  ),
  streamClips: {
    school: scenarios.stream.filter((clip) => clip.site === "school").length,
    store: scenarios.stream.filter((clip) => clip.site === "store").length,
  },
  runs,
};

const outPath = resolve("evals/results/learning-curve.json");
writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`);

for (const arm of summarizeRuns(runs)) {
  console.log(`\n${arm.label}`);
  console.table(
    arm.points.map((point) => ({
      week: point.week,
      labels: point.labels.mean,
      falseAlarms: `${point.falseAlarms.mean} (${point.falseAlarms.min}-${point.falseAlarms.max})`,
      missed: `${point.missed.mean} (${point.missed.min}-${point.missed.max})`,
      caught: `${point.caught.mean} of ${results.realTestEvents}`,
    })),
  );
}

const fallbacks = runs
  .flatMap((run) => run.arms.flatMap((arm) => arm.points))
  .reduce((sum, point) => sum + point.fallbacks, 0);
if (fallbacks > 0) console.log(`\n${fallbacks} test calls fell back.`);
console.log(`\nSaved ${outPath}`);
