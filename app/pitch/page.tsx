import { Suspense } from "react";
import type { Metadata } from "next";

import { PitchDeck } from "@/components/pitch/PitchDeck";

import "./pitch.css";

export const metadata: Metadata = {
  title: "Pitch",
  description:
    "The Veil pitch: problem, live demo, moat, market and ask, with every figure linked to its source.",
};

interface PitchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// /pitch is the full deck. /pitch?cut=video is the 2-minute submission video.
export default function PitchPage({ searchParams }: PitchPageProps) {
  // The query string is request data, so it is read inside Suspense.
  return (
    <Suspense fallback={<div className="min-h-dvh bg-void" />}>
      <DeckForCut searchParams={searchParams} />
    </Suspense>
  );
}

async function DeckForCut({ searchParams }: PitchPageProps) {
  const { cut } = await searchParams;
  return <PitchDeck cut={cut === "video" ? "video" : "full"} />;
}
