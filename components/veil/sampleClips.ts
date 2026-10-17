// Stock footage with actors, from Pexels (free to use, see public/demo/CREDITS.md).
// Served from /public/demo so the demo never depends on picking a file live.

export interface SampleClip {
  file: string;
  camera: string;
  title: string;
  watchFor: string;
}

/** The learning story, in the order it is shown. */
export const DEMO_PATH_CLIPS: SampleClip[] = [
  {
    file: "cam03-hallway-b-passing.mp4",
    camera: "Cam 03 / Hallway B",
    title: "Passing period",
    watchFor: "Students walk past. Every face blurred, nothing flagged.",
  },
  {
    file: "cam08-gym-hug.mp4",
    camera: "Cam 08 / Gym",
    title: "Two students grab each other",
    watchFor: "Flags a possible fight. It was a hug: mark it a false alarm.",
  },
  {
    file: "cam06-courtyard-hug.mp4",
    camera: "Cam 06 / Courtyard",
    title: "Another hug",
    watchFor: "After that label, a hug at another camera is not flagged.",
  },
  {
    file: "cam07-side-entrance-collar-grab.mp4",
    camera: "Cam 07 / Side entrance",
    title: "Student pinned to a wall",
    watchFor: "A real fight is still flagged. Learning did not hide it.",
  },
];

export const MORE_INCIDENT_CLIPS: SampleClip[] = [
  {
    file: "cam02-library-corridor-book-knocked.mp4",
    camera: "Cam 02 / Library corridor",
    title: "Book knocked away",
    watchFor: "Someone walks past and knocks a student's book down.",
  },
  {
    file: "cam09-bike-rack-bike-taken.mp4",
    camera: "Cam 09 / Bike rack",
    title: "Bike taken from the rack",
    watchFor: "A person rides off on a bike. Theft, or their own?",
  },
  {
    file: "cam11-loading-dock-camera-taped.mp4",
    camera: "Cam 11 / Loading dock",
    title: "Camera taped over",
    watchFor: "A masked person covers a security camera.",
  },
];

export const SAMPLE_CLIP_BASE_PATH = "/demo/";
