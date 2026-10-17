"use client";

import { useState } from "react";
import { ChevronDown, LockKeyhole, ShieldCheck } from "lucide-react";

import type { ClipFrame } from "@/lib/contracts";

import { formatClipTime, pluralize } from "./format";
import type { LockedFaceSummary } from "./FramePlayer";

const COLLAPSED_COUNT = 6;

interface LockedFacesListProps {
  faces: LockedFaceSummary[];
  frames: ClipFrame[];
  onSelect: (face: LockedFaceSummary) => void;
}

export function LockedFacesList({
  faces,
  frames,
  onSelect,
}: LockedFacesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const timeOf = (frameIndex: number) =>
    frames.find((frame) => frame.frameIndex === frameIndex)?.tSeconds ?? 0;
  const sorted = [...faces].sort((a, b) => a.frameIndex - b.frameIndex);
  const visible = isExpanded ? sorted : sorted.slice(0, COLLAPSED_COUNT);

  return (
    <section
      aria-label="Locked faces"
      className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <ShieldCheck className="size-4 text-indigo-400" aria-hidden />
          {pluralize(faces.length, "locked face")}
        </h2>
        <p className="text-xs leading-relaxed text-zinc-500">
          Each face has its own key. Unlocking one takes a written reason and
          goes in the audit log.
        </p>
      </div>

      {faces.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No faces were found in this clip, so there is nothing to unlock.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-2">
            {visible.map((face, index) => (
              <li key={face.id}>
                <button
                  type="button"
                  onClick={() => onSelect(face)}
                  className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 text-left text-sm text-zinc-300 outline-none transition-all duration-200 hover:border-zinc-600 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <LockKeyhole
                    className="size-4 shrink-0 text-indigo-400"
                    aria-hidden
                  />
                  <span className="truncate">
                    Face {index + 1}{" "}
                    <span className="font-mono text-xs text-zinc-500">
                      {formatClipTime(timeOf(face.frameIndex))}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {sorted.length > COLLAPSED_COUNT && (
            <button
              type="button"
              onClick={() => setIsExpanded((expanded) => !expanded)}
              aria-expanded={isExpanded}
              className="inline-flex w-fit cursor-pointer items-center gap-1 rounded-md text-xs font-medium text-zinc-400 outline-none transition-all duration-200 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {isExpanded ? "Show fewer" : `Show all ${sorted.length}`}
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
          )}
        </>
      )}
    </section>
  );
}
