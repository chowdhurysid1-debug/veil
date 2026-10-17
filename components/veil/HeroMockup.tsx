import { LockKeyhole, ShieldCheck, TriangleAlert } from "lucide-react";

import {
  MOCK_FRAME_COUNT,
  MOCK_SCENARIOS,
  mockFaceBoxes,
  mockFrameSvg,
  svgToDataUrl,
} from "@/lib/mock";

import { FrameImage } from "./FrameImage";

const SCENARIO = MOCK_SCENARIOS[0];
const FRAME_INDEX = 7;
const FRAME_URL = svgToDataUrl(mockFrameSvg(FRAME_INDEX, SCENARIO));
const FACE = mockFaceBoxes(SCENARIO).find(
  (box) => box.frameIndex === FRAME_INDEX,
);
const LAST_FRAME = MOCK_FRAME_COUNT - 1;
const MARKER_POSITION = `${(SCENARIO.event.frameIndex / LAST_FRAME) * 100}%`;
const PLAYHEAD_POSITION = `${(FRAME_INDEX / LAST_FRAME) * 100}%`;

/** The clip view, drawn with demo data: blurred frame, locked face, one alert. */
export function HeroMockup() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[2rem] bg-indigo-500/20 blur-3xl"
      />
      <figure className="relative rounded-2xl border border-white/10 bg-zinc-900/80 p-2 shadow-2xl shadow-black/60 backdrop-blur-md">
        <div className="relative aspect-video overflow-hidden rounded-xl">
          <FrameImage
            src={FRAME_URL}
            alt="A blurred hallway frame with one locked face"
            priority
          />
          {FACE && (
            <span
              aria-hidden
              className="absolute rounded-lg border-2 border-indigo-400/80 bg-indigo-500/10"
              style={{
                left: `${FACE.bbox.x * 100}%`,
                top: `${FACE.bbox.y * 100}%`,
                width: `${FACE.bbox.width * 100}%`,
                height: `${FACE.bbox.height * 100}%`,
              }}
            >
              <span className="absolute -top-2.5 -right-2.5 grid size-6 place-items-center rounded-full bg-zinc-950 text-indigo-300 ring-1 ring-indigo-400/60">
                <LockKeyhole className="size-3.5" />
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 px-2 pt-3 pb-1">
          <span className="font-mono text-[11px] text-zinc-500">0:11</span>
          <div className="relative h-1.5 flex-1 rounded-full bg-zinc-800">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-indigo-500/50"
              style={{ width: PLAYHEAD_POSITION }}
            />
            <span
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] bg-amber-400"
              style={{ left: MARKER_POSITION }}
            />
          </div>
          <span className="font-mono text-[11px] text-zinc-500">0:29</span>
        </div>
        <figcaption className="sr-only">
          The Veil clip view: every face blurred and locked, one possible fall
          flagged at 0:14.
        </figcaption>
      </figure>

      <div className="absolute -top-5 right-2 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-zinc-900/95 px-4 py-3 shadow-xl backdrop-blur-md sm:-right-6">
        <TriangleAlert className="size-5 text-amber-400" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-white">
            Possible fall at 0:14
          </p>
          <p className="text-xs text-zinc-400">Confidence 0.71, needs review</p>
        </div>
      </div>

      <div className="absolute -bottom-8 left-2 flex items-center gap-4 rounded-xl border border-white/10 bg-zinc-900/95 px-4 py-3 shadow-xl backdrop-blur-md sm:-left-6">
        <ShieldCheck className="size-5 text-indigo-400" aria-hidden />
        <div className="flex gap-4">
          <p className="flex flex-col">
            <span className="text-xl font-bold text-white">7</span>
            <span className="text-xs text-zinc-400">faces locked</span>
          </p>
          <p className="flex flex-col">
            <span className="text-xl font-bold text-emerald-300">0</span>
            <span className="text-xs text-zinc-400">in the clear</span>
          </p>
        </div>
      </div>
    </div>
  );
}
