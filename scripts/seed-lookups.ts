/**
 * Seed the LookupOption table from the values that used to live in
 * constants.ts. Idempotent (upsert by [type, label]) — does NOT touch
 * Application data. Run once after the migration:  npx tsx scripts/seed-lookups.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = /^\s*([\w.]+)\s*=\s*(.*)?\s*$/.exec(line);
      if (!m) continue;
      let val = (m[2] ?? "").trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = val;
    }
  } catch {
    /* ignore */
  }
}

type Row = { label: string; color: string; group?: string };

// Order in each array == sortOrder. Colors are the current palette; the two
// non-standard shades are mapped to the nearest allowed color:
//   Seneca Works: violet -> purple, Referral: rose -> pink.
const STATUS: Row[] = [
  { label: "Applied", color: "blue", group: "Applied" },
  { label: "Initial Interview", color: "amber", group: "Interviewing" },
  { label: "Technical Interview", color: "amber", group: "Interviewing" },
  { label: "Take-home Assessment", color: "purple", group: "Assessment" },
  { label: "Final Interview", color: "amber", group: "Interviewing" },
  { label: "Interviewing", color: "amber", group: "Interviewing" },
  { label: "Awaiting Interview — Hiring Manager", color: "amber", group: "Interviewing" },
  { label: "Awaiting Client Offer", color: "purple", group: "Assessment" },
  { label: "Job Offer", color: "green", group: "Offer" },
  { label: "Contract Signing", color: "green", group: "Offer" },
  { label: "Offer Accepted / Hired", color: "green", group: "Offer" },
  { label: "Hired", color: "green", group: "Offer" },
  { label: "Offered Another Position", color: "slate", group: "Closed" },
  { label: "Declined Offer", color: "red", group: "Closed" },
  { label: "Withdrew", color: "slate", group: "Closed" },
  { label: "Ghosted", color: "slate", group: "Closed" },
  { label: "Position Filled / Rejected", color: "red", group: "Closed" },
  { label: "Hiring Application Closed", color: "red", group: "Closed" },
];

const PLATFORM: Row[] = [
  { label: "LinkedIn", color: "sky" },
  { label: "Company Site", color: "indigo" },
  { label: "Seneca Works", color: "purple" },
  { label: "Indeed", color: "blue" },
  { label: "Kalibrr", color: "teal" },
  { label: "Referral", color: "pink" },
  { label: "HR Portal", color: "amber" },
  { label: "Other", color: "gray" },
];

const WORK_MODE: Row[] = [
  { label: "Remote", color: "emerald" },
  { label: "Hybrid", color: "sky" },
  { label: "On-site", color: "orange" },
  { label: "N/A", color: "gray" },
];

const ROLE_TYPE: Row[] = [
  { label: "Full-time", color: "gray" },
  { label: "Part-time", color: "gray" },
  { label: "Contract", color: "gray" },
  { label: "Freelance", color: "gray" },
  { label: "Internship", color: "gray" },
];

const INTERVIEW_ROUND: Row[] = [
  { label: "None", color: "gray" },
  { label: "Round 1", color: "gray" },
  { label: "Round 2", color: "gray" },
  { label: "Round 3", color: "gray" },
  { label: "Final Round", color: "gray" },
  { label: "Offer Stage", color: "gray" },
];

const ALL: Record<string, Row[]> = {
  STATUS,
  PLATFORM,
  WORK_MODE,
  ROLE_TYPE,
  INTERVIEW_ROUND,
};

async function main() {
  loadEnv();
  const { db } = await import("../src/lib/db");

  let count = 0;
  for (const [type, rows] of Object.entries(ALL)) {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      await db.lookupOption.upsert({
        where: { type_label: { type, label: r.label } },
        update: { color: r.color, group: r.group ?? null, sortOrder: i },
        create: {
          type,
          label: r.label,
          color: r.color,
          group: r.group ?? null,
          sortOrder: i,
        },
      });
      count++;
    }
  }
  console.log(`✓ Seeded ${count} lookup options.`);
  await db.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
