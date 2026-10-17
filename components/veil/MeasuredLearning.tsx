import { FALSE_ALARMS_PER_TYPE } from "@/lib/learning/fewShot";

import { armById, CURVE_SUMMARY, MeasuredCurve } from "./MeasuredCurve";

function lastPoint(id: Parameters<typeof armById>[0]) {
  const point = armById(id).points.at(-1);
  if (!point) throw new Error(`Learning curve arm ${id} has no points.`);
  return point;
}

/** The measured learning curve, with the numbers a judge will ask about. */
export function MeasuredLearning() {
  const oneSite = armById("one-site");
  const dayOne = oneSite.points[0];
  const weekFour = lastPoint("one-site");
  const storeOnly = lastPoint("store-only");
  const network = armById("network").points;
  const networkLast = network.at(-1);
  const networkBest = Math.min(
    ...network.map((point) => point.falseAlarms.mean),
  );
  const didNetworkSlip =
    networkLast !== undefined && networkLast.falseAlarms.mean > networkBest;

  const stats = [
    {
      value: `${dayOne.falseAlarms.mean} to ${weekFour.falseAlarms.mean}`,
      label: `False alarms, day 1 to week ${weekFour.week}, one school`,
    },
    {
      value: `${weekFour.caught.min} of ${CURVE_SUMMARY.realTestEvents}`,
      label: `Real incidents still caught in week ${weekFour.week}, every run`,
    },
    {
      value: `${dayOne.falseAlarms.mean} to ${storeOnly.falseAlarms.mean}`,
      label: "A school with zero labels of its own, taught by a store",
    },
  ];

  return (
    <section
      aria-labelledby="measured-learning"
      className="flex flex-col gap-6 border border-hairline bg-panel p-5 sm:p-8"
    >
      <div className="flex flex-col gap-3">
        <p className="label-mono text-signal">Measured with the real model</p>
        <h2
          id="measured-learning"
          className="font-display text-title font-bold text-ink uppercase"
        >
          It gets better with every label.
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          Faces are blurred, so on day one the AI cannot tell a hug from a
          fight. It flags both and lets officers decide. Each alert an officer
          marks cuts the false alarms that follow, and real incidents keep
          getting through.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <MeasuredCurve />
        <dl className="flex flex-col">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-1 border-b border-hairline py-4 first:border-t"
            >
              <dd className="font-display text-4xl font-bold tracking-tight text-ink tabular-nums">
                {stat.value}
              </dd>
              <dt className="label-mono">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-col gap-2 border-t border-hairline pt-4 text-sm leading-relaxed text-ink-muted">
        <p>
          How it was measured: {CURVE_SUMMARY.testClips} school test clips (
          {CURVE_SUMMARY.harmlessTestClips} harmless, the rest real incidents),
          written and frozen before the first run. Four weeks of alerts from a
          school ({CURVE_SUMMARY.streamClips.school} clips) and a store (
          {CURVE_SUMMARY.streamClips.store} clips); the officer labels only what
          gets flagged, exactly as in the app. Run it with{" "}
          <code className="font-mono text-ink">npm run evals:learning</code>.
        </p>
        {CURVE_SUMMARY.everyMissWasFailedCall && (
          <p>
            Every real incident that went unflagged in any run was a model call
            that failed to parse, which the app shows as &ldquo;review
            manually&rdquo;. Learning never hid one.
          </p>
        )}
        {didNetworkSlip && networkLast && (
          <p>
            Known issue: the school + store line rose to{" "}
            {networkLast.falseAlarms.mean} in week {networkLast.week}. Our best
            read is that the AI sees only the {FALSE_ALARMS_PER_TYPE} newest
            false alarms per type, so newer labels pushed the hug lesson out.
            The next fix keeps more of them.
          </p>
        )}
      </div>
    </section>
  );
}
