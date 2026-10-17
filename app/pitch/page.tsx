import type { Metadata } from "next";

import { PitchDeck } from "@/components/pitch/PitchDeck";

import "./pitch.css";

export const metadata: Metadata = {
  title: "Pitch",
  description:
    "The Veil pitch: problem, live demo, moat, market and ask, with every figure linked to its source.",
};

export default function PitchPage() {
  return <PitchDeck />;
}
