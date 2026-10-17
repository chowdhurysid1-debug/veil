"use client";

import { useState } from "react";
import { ChevronDown, LockKeyhole } from "lucide-react";

import type { ClipFrame } from "@/lib/contracts";

import { formatClipTime } from "./format";
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
      className="flex flex-col gap-4 border border-hairline bg-panel p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 className="label-mono text-ink">
          Face vault / {String(faces.length).padStart(2, "0")} locked
        </h2>
        <p className="text-xs leading-relaxed text-ink-muted">
          Each face has its own key. Unlocking one takes a written reason and
          goes in the audit log.
        </p>
      </div>

      {faces.length === 0 ? (
        <p className="text-sm text-ink-muted">
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
                  className="flex h-11 w-full cursor-pointer items-center gap-2 border border-hairline px-3 text-left font-mono text-xs tracking-[0.1em] text-ink-muted uppercase outline-none transition-colors duration-500 ease-veil hover:border-ink hover:text-ink focus-visible:ring-1 focus-visible:ring-signal"
                >
                  <LockKeyhole
                    className="size-3.5 shrink-0"
                    aria-hidden
                  />
                  <span className="truncate">
                    Face {index + 1}{" "}
                    <span className="text-ink-dim">
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
              className="label-mono inline-flex w-fit cursor-pointer items-center gap-1 outline-none transition-colors duration-500 ease-veil hover:text-ink focus-visible:ring-1 focus-visible:ring-signal"
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
