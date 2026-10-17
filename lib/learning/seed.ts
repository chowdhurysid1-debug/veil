// Demo seed data. Every row is fake and marked: ids start with "5eed" and seed clip
// filenames start with "seed-data-". supabase/seed.sql is generated from this file,
// and the evals use it as the starting label history, so the two never drift apart.
import type { EventType, FeedbackLabel, Site } from "../contracts";
import type { LabeledEvent } from "./types";

// Same ids as MOCK_SITES in lib/mock.ts, so the UI and the database agree on the demo site.
export const SEED_SITES = [
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
] as const satisfies readonly Site[];

export const SEED_FILENAME_PREFIX = "seed-data-";

interface SeedLabel {
  siteIndex: 0 | 1;
  daysAgo: number;
  type: EventType;
  label: FeedbackLabel;
  description: string;
  note: string | null;
}

// No high-five false alarm on purpose: the demo teaches that one live.
export const SEED_LABELS: readonly SeedLabel[] = [
  {
    siteIndex: 0,
    daysAgo: 6,
    type: "fall",
    label: "real",
    description:
      "A person slips near the cafeteria doors and lands hard on their back.",
    note: "Wet floor. Nurse responded.",
  },
  {
    siteIndex: 1,
    daysAgo: 6,
    type: "fall",
    label: "real",
    description:
      "A person loses balance in the produce aisle and falls onto one hip.",
    note: "Customer fell, staff helped.",
  },
  {
    siteIndex: 0,
    daysAgo: 6,
    type: "fight",
    label: "real",
    description:
      "Two people shove each other near the lockers and one is pushed into the wall.",
    note: "Fight broken up by staff.",
  },
  {
    siteIndex: 1,
    daysAgo: 6,
    type: "theft",
    label: "real",
    description:
      "A person puts items from a shelf into a backpack and leaves past the registers without paying.",
    note: "Confirmed shoplifting.",
  },
  {
    siteIndex: 0,
    daysAgo: 5,
    type: "fall",
    label: "false_alarm",
    description:
      "A person sits down on the hallway floor with their back against the wall.",
    note: "Student sat down to wait for class.",
  },
  {
    siteIndex: 1,
    daysAgo: 5,
    type: "fall",
    label: "false_alarm",
    description: "A person lies down across a bench near the store entrance.",
    note: "Resting on the bench.",
  },
  {
    siteIndex: 0,
    daysAgo: 5,
    type: "fight",
    label: "false_alarm",
    description:
      "Two people play-wrestle while laughing, then walk away together.",
    note: "Friends messing around.",
  },
  {
    siteIndex: 0,
    daysAgo: 5,
    type: "other",
    label: "real",
    description:
      "A person reaches up and covers the hallway camera with a sheet of paper, then walks away.",
    note: "Camera covered. Facilities restored it.",
  },
  {
    siteIndex: 0,
    daysAgo: 4,
    type: "fall",
    label: "real",
    description:
      "A person trips on the stairs and falls forward onto the landing.",
    note: null,
  },
  {
    siteIndex: 0,
    daysAgo: 4,
    type: "fight",
    label: "real",
    description: "One person throws punches at another outside the gym doors.",
    note: null,
  },
  {
    siteIndex: 1,
    daysAgo: 4,
    type: "theft",
    label: "false_alarm",
    description:
      "A person puts a water bottle they brought with them into their own bag.",
    note: "Own item.",
  },
  {
    siteIndex: 0,
    daysAgo: 3,
    type: "fall",
    label: "false_alarm",
    description:
      "A person drops to the floor and starts doing push-ups in the gym corridor.",
    note: "PE warm-up.",
  },
  {
    siteIndex: 1,
    daysAgo: 3,
    type: "fall",
    label: "false_alarm",
    description: "A display mannequin tips over and lands on the floor.",
    note: "Mannequin, no person involved.",
  },
  {
    siteIndex: 1,
    daysAgo: 3,
    type: "fight",
    label: "real",
    description:
      "Two people grapple at the parking lot entrance and fall against a cart rack.",
    note: null,
  },
  {
    siteIndex: 1,
    daysAgo: 2,
    type: "fall",
    label: "real",
    description:
      "A person collapses beside the checkout line and does not get up.",
    note: "Medical call.",
  },
  {
    siteIndex: 1,
    daysAgo: 2,
    type: "theft",
    label: "real",
    description:
      "A person removes a security tag from a jacket and hides the jacket under their coat.",
    note: null,
  },
  {
    siteIndex: 0,
    daysAgo: 2,
    type: "theft",
    label: "real",
    description:
      "A person opens a locker that is not theirs and takes a laptop.",
    note: "Reported stolen laptop.",
  },
  {
    siteIndex: 0,
    daysAgo: 1,
    type: "fall",
    label: "real",
    description:
      "A person is knocked to the ground in a crowded hallway and stays down.",
    note: null,
  },
  {
    siteIndex: 0,
    daysAgo: 1,
    type: "fight",
    label: "real",
    description:
      "A group surrounds two people who are hitting each other in the courtyard.",
    note: "Security responded.",
  },
  {
    siteIndex: 1,
    daysAgo: 1,
    type: "theft",
    label: "real",
    description:
      "A person cuts the lock on a bike at the rack by the entrance and rides off on it.",
    note: "Customer reported the bike stolen.",
  },
];

export const SEED_TABLES = {
  clips: 1,
  frames: 2,
  events: 3,
  feedback: 4,
} as const;

export function seedId(table: keyof typeof SEED_TABLES, index: number): string {
  return `5eed000${SEED_TABLES[table]}-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

// UTC time of day for each label, so rows on the same day keep a stable order.
// supabase/seed.sql expresses the same offsets with make_interval.
export function seedOffset(index: number, daysAgo: number) {
  return { days: -daysAgo, hours: 9 + (index % 8), minutes: (index * 7) % 60 };
}

const MINUTE_MS = 60_000;

export function seedCreatedAt(
  index: number,
  daysAgo: number,
  now: Date,
): string {
  const { days, hours, minutes } = seedOffset(index, daysAgo);
  const dayStart = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const offsetMinutes = days * 24 * 60 + hours * 60 + minutes;
  return new Date(dayStart + offsetMinutes * MINUTE_MS).toISOString();
}

export function seedLabeledEvents(now: Date): LabeledEvent[] {
  return SEED_LABELS.map((seed, index) => {
    const site = SEED_SITES[seed.siteIndex];
    return {
      eventId: seedId("events", index + 1),
      eventType: seed.type,
      description: seed.description,
      label: seed.label,
      note: seed.note,
      siteId: site.id,
      siteName: site.name,
      createdAt: seedCreatedAt(index, seed.daysAgo, now),
    };
  });
}
