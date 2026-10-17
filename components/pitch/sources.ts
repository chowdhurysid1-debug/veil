// Every figure in the pitch links to one of these. Checked 2026-10-17.
export interface Source {
  label: string;
  href: string;
}

export const SOURCES = {
  nces: {
    label: "NCES, Condition of Education",
    href: "https://nces.ed.gov/programs/coe/indicator/a19/school-reported-safety-practices",
  },
  facebook: {
    label: "Orrick InfoBytes, March 2021",
    href: "https://infobytes.orrick.com/2021-03-04/court-approves-650-million-biometric-privacy-class-action-settlement/",
  },
  metaTexas: {
    label: "Texas Tribune, July 2024",
    href: "https://www.texastribune.org/2024/07/30/texas-meta-facebook-biometric-data-settlement",
  },
  verkadaBreach: {
    label: "Axios, citing Bloomberg, March 2021",
    href: "https://www.axios.com/2021/03/09/hackers-breach-verkada-security-cameras",
  },
  riteAid: {
    label: "Bloomberg Law, December 2023",
    href: "https://news.bloomberglaw.com/daily-labor-report/rite-aid-banned-from-ai-facial-recognition-by-ftc-after-misuse",
  },
  euAiAct: {
    label: "Orrick, April 2025",
    href: "https://www.orrick.com/en/Insights/2025/04/EU-Commission-Publishes-Guidelines-on-the-Prohibited-AI-Practices-under-the-AI-Act",
  },
  verkadaBlur: {
    label: "Verkada product updates, November 2023",
    href: "https://www.verkada.com/blog/nov-2023-product-updates/",
  },
  memoori: {
    label: "Memoori, Video Surveillance 2025 to 2030",
    href: "https://memoori.com/portfolio/global-video-surveillance-business-2025-2030/",
  },
} as const satisfies Record<string, Source>;
