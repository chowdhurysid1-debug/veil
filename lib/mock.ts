// Sample data matching lib/contracts.ts so the UI can be built before the API exists.
// Tab C owns this file after the initial stub. Every value here is fake demo data.
import type {
  AnalyzeResponse,
  AuditEntry,
  BoundingBox,
  ClipDetail,
  ClipSummary,
  DetectedEvent,
  LearningStats,
  Site,
  UnlockResponse,
  VerifyResponse,
} from "./contracts";

export const MOCK_SITES: Site[] = [
  {
    id: "3f2b8c1e-5d4a-4b7e-9c1f-2a6d8e0b4c71",
    name: "Demo High School",
    kind: "school",
  },
  {
    id: "8a1d2e3f-4b5c-4d6e-8f70-9a1b2c3d4e5f",
    name: "Northside Market",
    kind: "store",
  },
];

// ---------- Demo scenarios ----------
// The three clips from the SPEC demo path. Frames are drawn as SVG so the UI
// has something that looks like blurred CCTV before the real pipeline lands.

export type MockScenarioId = "shoe_tie" | "similar_crouch" | "real_fall";

export interface MockScenario {
  id: MockScenarioId;
  filename: string;
  event: DetectedEvent;
  /** Frames where the person is on the floor. Faces are not detected there. */
  downFrames: { from: number; to: number };
  pose: "crouch" | "lying";
}

export const MOCK_FRAME_COUNT = 20;
export const MOCK_FRAME_SPACING_SECONDS = 1.5;
const EVENT_FRAME = 9;

export const MOCK_SCENARIOS: MockScenario[] = [
  {
    id: "shoe_tie",
    filename: "hallway-b-1404.mp4",
    event: {
      frameIndex: EVENT_FRAME,
      type: "fall",
      confidence: 0.71,
      description: "A person goes from standing to the floor near the lockers.",
    },
    downFrames: { from: EVENT_FRAME, to: 12 },
    pose: "crouch",
  },
  {
    id: "similar_crouch",
    filename: "hallway-b-1522.mp4",
    event: {
      frameIndex: EVENT_FRAME,
      type: "fall",
      confidence: 0.66,
      description:
        "A person lowers to the floor beside the lockers and stays down for a few seconds.",
    },
    downFrames: { from: EVENT_FRAME, to: 12 },
    pose: "crouch",
  },
  {
    id: "real_fall",
    filename: "stairwell-a-1610.mp4",
    event: {
      frameIndex: EVENT_FRAME,
      type: "fall",
      confidence: 0.9,
      description:
        "A person slips, lands on their side, and does not get up for the rest of the clip.",
    },
    downFrames: { from: EVENT_FRAME, to: MOCK_FRAME_COUNT - 1 },
    pose: "lying",
  },
];

const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 360;
const HEAD_RADIUS = 16;
const UPRIGHT_HEAD_Y = 150;
const WALK_START_FRAME = 5;
const WALK_END_FRAME = 15;

type Pose = "upright" | "crouch" | "lying" | "absent";

interface PersonState {
  pose: Pose;
  x: number;
}

function personAt(frameIndex: number, scenario: MockScenario): PersonState {
  const { from, to } = scenario.downFrames;
  if (frameIndex >= from && frameIndex <= to) {
    return { pose: scenario.pose, x: 330 };
  }
  if (frameIndex >= WALK_START_FRAME && frameIndex < from) {
    return { pose: "upright", x: 560 - (frameIndex - WALK_START_FRAME) * 70 };
  }
  if (frameIndex > to && frameIndex <= WALK_END_FRAME) {
    return { pose: "upright", x: 300 - (frameIndex - to - 1) * 80 };
  }
  return { pose: "absent", x: 0 };
}

/** Face boxes the mock pipeline "detects": one per frame where the person stands. */
export function mockFaceBoxes(
  scenario: MockScenario,
): { frameIndex: number; bbox: BoundingBox }[] {
  const boxes: { frameIndex: number; bbox: BoundingBox }[] = [];
  for (let frameIndex = 0; frameIndex < MOCK_FRAME_COUNT; frameIndex++) {
    const person = personAt(frameIndex, scenario);
    if (person.pose !== "upright") continue;
    const size = HEAD_RADIUS * 2 + 12;
    boxes.push({
      frameIndex,
      bbox: {
        x: round4((person.x - size / 2) / FRAME_WIDTH),
        y: round4((UPRIGHT_HEAD_Y - size / 2) / FRAME_HEIGHT),
        width: round4(size / FRAME_WIDTH),
        height: round4(size / FRAME_HEIGHT),
      },
    });
  }
  return boxes;
}

function round4(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function personSvg(person: PersonState): string {
  const body = "#4b5563";
  const head = `fill="#a1a1aa" filter="url(#faceblur)"`;
  switch (person.pose) {
    case "upright":
      return `<rect x="${person.x - 22}" y="170" width="44" height="122" rx="18" fill="${body}"/><circle cx="${person.x}" cy="${UPRIGHT_HEAD_Y}" r="${HEAD_RADIUS}" ${head}/>`;
    case "crouch":
      return `<rect x="${person.x - 28}" y="236" width="56" height="62" rx="20" fill="${body}"/><circle cx="${person.x + 6}" cy="222" r="${HEAD_RADIUS}" ${head}/>`;
    case "lying":
      return `<rect x="${person.x - 62}" y="276" width="124" height="26" rx="12" fill="${body}"/><circle cx="${person.x - 80}" cy="286" r="${HEAD_RADIUS}" ${head}/>`;
    case "absent":
      return "";
  }
}

/** A blurred CCTV-style frame as an SVG string. */
export function mockFrameSvg(
  frameIndex: number,
  scenario: MockScenario,
): string {
  const lockers = Array.from(
    { length: 9 },
    (_, index) =>
      `<rect x="${20 + index * 68}" y="92" width="60" height="200" rx="3" fill="#262a33" stroke="#1b1e24" stroke-width="2"/>` +
      `<rect x="${32 + index * 68}" y="104" width="36" height="3" fill="#1b1e24"/><rect x="${32 + index * 68}" y="111" width="36" height="3" fill="#1b1e24"/>`,
  ).join("");
  const seconds = String(
    Math.floor(12 + frameIndex * MOCK_FRAME_SPACING_SECONDS),
  ).padStart(2, "0");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FRAME_WIDTH} ${FRAME_HEIGHT}" width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}">` +
    `<defs><filter id="faceblur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>` +
    `<radialGradient id="vignette" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.6"/></radialGradient>` +
    `<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2d35"/><stop offset="1" stop-color="#17191e"/></linearGradient></defs>` +
    `<rect width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}" fill="#1c1f26"/>` +
    `<rect width="${FRAME_WIDTH}" height="64" fill="#14161b"/>` +
    `<rect x="80" y="26" width="140" height="6" rx="3" fill="#e4e4e7" opacity="0.35"/><rect x="420" y="26" width="140" height="6" rx="3" fill="#e4e4e7" opacity="0.35"/>` +
    lockers +
    `<rect y="296" width="${FRAME_WIDTH}" height="64" fill="url(#floor)"/>` +
    personSvg(personAt(frameIndex, scenario)) +
    `<rect width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}" fill="url(#vignette)"/>` +
    `<g font-family="ui-monospace, Menlo, monospace" font-size="13" fill="#e4e4e7" opacity="0.85">` +
    `<text x="16" y="24">CAM 03  HALLWAY B</text><text x="16" y="344">2026-10-16  14:04:${seconds}</text></g>` +
    `<circle cx="612" cy="20" r="5" fill="#f43f5e"/>` +
    `</svg>`
  );
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Shown in place of a decrypted face while the vault is mocked. Not a real person. */
export const MOCK_FACE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">` +
  `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#312e81"/><stop offset="1" stop-color="#18181b"/></linearGradient></defs>` +
  `<rect width="160" height="160" fill="url(#bg)"/>` +
  `<circle cx="80" cy="64" r="30" fill="#a1a1aa"/>` +
  `<path d="M24 160c4-34 26-52 56-52s52 18 56 52z" fill="#71717a"/>` +
  `</svg>`;

// ---------- Seeded records ----------

const CLIP_ID = "5c7e9a1b-2d3f-4a5b-8c6d-7e8f9a0b1c2d";
const SEED_SCENARIO = MOCK_SCENARIOS[0];
const SEED_FACES = mockFaceBoxes(SEED_SCENARIO);

/** SHA-256 of the seeded clip's "original file". Verify compares against this. */
export const MOCK_SEED_ORIGINAL_SHA256 =
  "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

export const MOCK_CLIPS: ClipSummary[] = [
  {
    id: CLIP_ID,
    filename: "hallway-b-0912.mp4",
    siteName: "Demo High School",
    stampedAt: "2026-10-16T16:12:00.000Z",
    facesLocked: SEED_FACES.length,
    eventsFlagged: 1,
  },
];

export const MOCK_CLIP_DETAIL: ClipDetail = {
  ...MOCK_CLIPS[0],
  frames: Array.from({ length: MOCK_FRAME_COUNT }, (_, index) => ({
    id: `6d8f0a2b-3c4d-4e5f-9a6b-${String(index).padStart(12, "0")}`,
    frameIndex: index,
    tSeconds: index * MOCK_FRAME_SPACING_SECONDS,
    blurredUrl: svgToDataUrl(mockFrameSvg(index, SEED_SCENARIO)),
  })),
  events: [
    {
      ...SEED_SCENARIO.event,
      id: "7e9a1b3c-4d5e-4f6a-8b7c-8d9e0f1a2b3c",
      clipId: CLIP_ID,
      flagged: true,
      threshold: 0.6,
      label: null,
    },
  ],
  faces: SEED_FACES.map((face, index) => ({
    id: `9b1c3d5e-6f7a-4b8c-9d0e-${String(index).padStart(12, "0")}`,
    ...face,
  })),
};

export const MOCK_ANALYZE_RESPONSE: AnalyzeResponse = {
  clipId: CLIP_ID,
  events: MOCK_CLIP_DETAIL.events,
  isFallback: false,
  learnedFrom: { labels: 21, sites: 2 },
};

export const MOCK_LEARNING_STATS: LearningStats = {
  totalLabels: 21,
  sitesContributing: 2,
  byType: [
    { type: "fall", labels: 9, falseAlarmRate: 0.44, threshold: 0.6 },
    { type: "fight", labels: 5, falseAlarmRate: 0.2, threshold: 0.5 },
    { type: "theft", labels: 4, falseAlarmRate: 0.25, threshold: 0.55 },
    { type: "fire", labels: 3, falseAlarmRate: 0, threshold: 0.4 },
  ],
  recent: [
    {
      eventType: "fall",
      label: "false_alarm",
      siteName: "Northside Market",
      createdAt: "2026-10-16T20:51:00.000Z",
    },
    {
      eventType: "fight",
      label: "real",
      siteName: "Demo High School",
      createdAt: "2026-10-16T20:40:00.000Z",
    },
    {
      eventType: "theft",
      label: "false_alarm",
      siteName: "Northside Market",
      createdAt: "2026-10-16T19:58:00.000Z",
    },
    {
      eventType: "fall",
      label: "real",
      siteName: "Demo High School",
      createdAt: "2026-10-16T18:22:00.000Z",
    },
  ],
  history: [
    { date: "2026-10-10", falseAlarmRate: 0.58 },
    { date: "2026-10-11", falseAlarmRate: 0.55 },
    { date: "2026-10-12", falseAlarmRate: 0.52 },
    { date: "2026-10-13", falseAlarmRate: 0.47 },
    { date: "2026-10-14", falseAlarmRate: 0.41 },
    { date: "2026-10-15", falseAlarmRate: 0.36 },
    { date: "2026-10-16", falseAlarmRate: 0.31 },
  ],
};

export const MOCK_AUDIT: AuditEntry[] = [
  {
    id: "1a3b5c7d-8e9f-4a0b-9c1d-2e3f4a5b6c7d",
    faceId: MOCK_CLIP_DETAIL.faces[0].id,
    clipId: CLIP_ID,
    actor: "Safety Officer, Demo High School",
    reasonCategory: "incident_investigation",
    reason: "Identify the student who fell so the nurse can follow up.",
    createdAt: "2026-10-16T16:30:00.000Z",
  },
];

export const MOCK_UNLOCK_RESPONSE: UnlockResponse = {
  faceId: MOCK_CLIP_DETAIL.faces[0].id,
  auditId: MOCK_AUDIT[0].id,
  rawKeyBase64: "bW9jay1rZXktbm90LXJlYWw=",
  ivBase64: "bW9jay1pdg==",
  ciphertextUrl: "https://placehold.co/128x128/18181b/71717a?text=face",
  expiresAt: "2026-10-16T16:30:30.000Z",
};

export const MOCK_VERIFY_INTACT: VerifyResponse = {
  clipId: CLIP_ID,
  status: "intact",
  stampedAt: MOCK_CLIPS[0].stampedAt,
  stampedSha256Prefix: MOCK_SEED_ORIGINAL_SHA256.slice(0, 12),
};

export const MOCK_VERIFY_TAMPERED: VerifyResponse = {
  ...MOCK_VERIFY_INTACT,
  status: "tampered",
};
