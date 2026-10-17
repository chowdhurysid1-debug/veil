import { cn } from "cn";

import summaryJson from "@/evals/results/learning-curve-summary.json";
import {
  curveSummarySchema,
  type ArmId,
  type ArmSummary,
} from "@/lib/learning/curve";

// Measured by `npm run evals:learning`. A test keeps this file in sync with the raw results.
export const CURVE_SUMMARY = curveSummarySchema.parse(summaryJson);

const MARGIN = { top: 16, right: 16, bottom: 34, left: 36 };

const ARM_STYLES: Record<
  ArmId,
  { line: string; dot: string; dash?: string; legend: string }
> = {
  "one-site": {
    line: "stroke-signal",
    dot: "fill-signal",
    legend: "bg-signal",
  },
  "store-only": {
    line: "stroke-ink",
    dot: "fill-ink",
    dash: "6 5",
    legend: "bg-ink",
  },
  network: {
    line: "stroke-ink-dim",
    dot: "fill-ink-dim",
    dash: "2 5",
    legend: "bg-ink-dim",
  },
};

export function armById(id: ArmId): ArmSummary {
  const arm = CURVE_SUMMARY.arms.find((candidate) => candidate.id === id);
  if (!arm) throw new Error(`Learning curve summary has no ${id} arm.`);
  return arm;
}

function weekLabel(week: number) {
  return week === 0 ? "Day 1" : `Wk ${week}`;
}

interface MeasuredCurveProps {
  arms?: ArmId[];
  className?: string;
}

/** False alarms on the same harmless test clips, week by week, as labels arrive. */
export function MeasuredCurve({
  arms = ["one-site", "store-only", "network"],
  className,
}: MeasuredCurveProps) {
  const shown = arms.map(armById);
  const weeks = shown[0]?.points.length ?? 0;
  const yMax = CURVE_SUMMARY.harmlessTestClips;

  const oneSite = shown.find((arm) => arm.id === "one-site");

  return (
    <figure className={cn("flex flex-col gap-4", className)}>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {shown.map((arm) => (
          <li key={arm.id} className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn("h-0.5 w-5", ARM_STYLES[arm.id].legend)}
            />
            <span className="label-mono text-ink-muted">{arm.label}</span>
          </li>
        ))}
      </ul>

      <CurveSvg
        shown={shown}
        width={640}
        height={280}
        fontSize={11}
        className="hidden h-auto w-full sm:block"
      />
      <CurveSvg
        shown={shown}
        width={340}
        height={240}
        fontSize={10}
        className="h-auto w-full sm:hidden"
      />

      <table className="sr-only">
        <caption>
          False alarms by week, mean of {CURVE_SUMMARY.runs} runs
        </caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            {shown.map((arm) => (
              <th key={arm.id} scope="col">
                {arm.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: weeks }, (_, index) => (
            <tr key={index}>
              <th scope="row">{weekLabel(index)}</th>
              {shown.map((arm) => (
                <td key={arm.id}>{arm.points[index]?.falseAlarms.mean}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <figcaption className="label-mono leading-relaxed">
        Y axis: false alarms on {yMax} harmless test clips. Mean of{" "}
        {CURVE_SUMMARY.runs} runs{oneSite ? ", amber band is the range" : ""}.
        Written frame descriptions, not video. {CURVE_SUMMARY.model}.
      </figcaption>
    </figure>
  );
}

interface CurveSvgProps {
  shown: ArmSummary[];
  width: number;
  height: number;
  fontSize: number;
  className: string;
}

// Drawn at two widths so axis labels stay readable on a phone instead of shrinking.
function CurveSvg({
  shown,
  width,
  height,
  fontSize,
  className,
}: CurveSvgProps) {
  const weeks = shown[0]?.points.length ?? 0;
  const yMax = CURVE_SUMMARY.harmlessTestClips;
  const oneSite = shown.find((arm) => arm.id === "one-site");
  const first = shown[0]?.points[0];
  const summaryText = shown
    .map(
      (arm) =>
        `${arm.label}: ${arm.points.map((point) => point.falseAlarms.mean).join(", ")}`,
    )
    .join(". ");
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const x = (index: number) =>
    MARGIN.left + (weeks <= 1 ? 0 : (index / (weeks - 1)) * plotWidth);
  const y = (value: number) => MARGIN.top + plotHeight * (1 - value / yMax);
  const ticks = Array.from({ length: yMax / 2 + 1 }, (_, index) => index * 2);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`False alarms on ${yMax} harmless test clips by week. ${summaryText}.`}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={MARGIN.left}
            x2={width - MARGIN.right}
            y1={y(tick)}
            y2={y(tick)}
            className="stroke-hairline"
            strokeWidth={1}
          />
          <text
            fontSize={fontSize}
            x={MARGIN.left - 10}
            y={y(tick)}
            dy="0.32em"
            textAnchor="end"
            className="fill-ink-dim font-mono"
          >
            {tick}
          </text>
        </g>
      ))}

      {oneSite && (
        <path
          d={[
            ...oneSite.points.map(
              (point, index) =>
                `${index === 0 ? "M" : "L"}${x(index)},${y(point.falseAlarms.max)}`,
            ),
            ...[...oneSite.points]
              .reverse()
              .map(
                (point, index) =>
                  `L${x(oneSite.points.length - 1 - index)},${y(point.falseAlarms.min)}`,
              ),
            "Z",
          ].join(" ")}
          className="fill-signal/10"
        />
      )}

      {shown.map((arm) => (
        <g key={arm.id}>
          <polyline
            points={arm.points
              .map((point, index) => `${x(index)},${y(point.falseAlarms.mean)}`)
              .join(" ")}
            fill="none"
            className={ARM_STYLES[arm.id].line}
            strokeWidth={arm.id === "one-site" ? 3 : 2}
            strokeDasharray={ARM_STYLES[arm.id].dash}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {arm.points.map((point, index) => (
            <circle
              key={point.week}
              cx={x(index)}
              cy={y(point.falseAlarms.mean)}
              r={arm.id === "one-site" ? 4.5 : 3.5}
              className={ARM_STYLES[arm.id].dot}
            />
          ))}
        </g>
      ))}

      {first &&
        shown[0].points.map((point, index) => (
          <text
            fontSize={fontSize}
            key={point.week}
            x={x(index)}
            y={height - 10}
            textAnchor={
              index === 0 ? "start" : index === weeks - 1 ? "end" : "middle"
            }
            className="fill-ink-dim font-mono uppercase"
          >
            {weekLabel(point.week)}
          </text>
        ))}
    </svg>
  );
}
