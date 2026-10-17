import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { MODEL_ID } from "../lib/ai";
import {
  buildSummary,
  curveResultsSchema,
  curveScenariosSchema,
  runCurve,
  type CurveResults,
  type CurveRun,
} from "../lib/learning/curve";
import { analyzeFrames } from "../lib/server/analyzeFrames";

// Usage: npm run evals:learning -- --runs 3
// Every run calls the model about 270 times with text-only frames.
// npm run evals:learning -- --summarize rebuilds the summary from saved results, no model calls.
const resultsPath = resolve("evals/results/learning-curve.json");
const summaryPath = resolve("evals/results/learning-curve-summary.json");

function writeSummary(results: CurveResults) {
  const summary = buildSummary(results);
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  for (const arm of summary.arms) {
    console.log(`\n${arm.label}`);
    console.table(
      arm.points.map((point) => ({
        week: point.week,
        labels: point.labels.mean,
        falseAlarms: `${point.falseAlarms.mean} (${point.falseAlarms.min}-${point.falseAlarms.max})`,
        missed: `${point.missed.mean} (${point.missed.min}-${point.missed.max})`,
        caught: `${point.caught.mean} of ${summary.realTestEvents}`,
        failedCalls: point.fallbacks.mean,
      })),
    );
  }
  console.log(`\nSaved ${summaryPath}`);
}

if (process.argv.includes("--summarize")) {
  writeSummary(
    curveResultsSchema.parse(JSON.parse(readFileSync(resultsPath, "utf8"))),
  );
  process.exit(0);
}

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

writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
console.log(`Saved ${resultsPath}`);
writeSummary(results);
