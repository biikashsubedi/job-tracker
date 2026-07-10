import type { StatusGroup } from "./status-groups";
import type { ApplicationRow } from "./types";

export interface DashboardStats {
  total: number;
  active: number;
  interviewing: number;
  offers: number;
  closed: number;
  responseRate: number;
}

export function computeStats(
  apps: ApplicationRow[],
  groups: StatusGroup[]
): DashboardStats {
  const total = apps.length;
  const closed = groups.find((g) => g.label === "Closed")?.statuses ?? [];
  // Terminal = Closed group plus accepted/hired outcomes — nothing left to do.
  const terminal = new Set<string>([
    ...closed,
    "Offer Accepted / Hired",
    "Hired",
  ]);
  const groupLabelOf = (status: string) =>
    groups.find((g) => g.statuses.includes(status))?.label;
  const inGroup = (label: string) =>
    apps.filter((a) => groupLabelOf(a.status) === label).length;
  // "Responded" = progressed past Applied; Ghosted means no response ever came.
  const responded = apps.filter(
    (a) => a.status !== "Applied" && a.status !== "Ghosted"
  ).length;
  return {
    total,
    active: apps.filter((a) => !terminal.has(a.status)).length,
    interviewing: inGroup("Interviewing"),
    offers: inGroup("Offer"),
    closed: inGroup("Closed"),
    responseRate: total === 0 ? 0 : Math.round((responded / total) * 100),
  };
}

export interface ChartSlice {
  name: string;
  value: number;
  fill: string;
  pct: number;
}

/** hexFor maps an option label to its chart color. */
function shares(
  apps: ApplicationRow[],
  labels: string[],
  valueOf: (app: ApplicationRow) => string,
  hexFor: (label: string) => string
): ChartSlice[] {
  const counts = new Map<string, number>(labels.map((l) => [l, 0]));
  for (const app of apps) {
    const key = valueOf(app);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = apps.length;
  return Array.from(counts.entries())
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      fill: hexFor(name),
      pct: total === 0 ? 0 : Math.round((value / total) * 100),
    }));
}

export function statusBreakdown(
  apps: ApplicationRow[],
  labels: string[],
  hexFor: (label: string) => string
): ChartSlice[] {
  return shares(apps, labels, (a) => a.status, hexFor);
}

export function platformShare(
  apps: ApplicationRow[],
  labels: string[],
  hexFor: (label: string) => string
): ChartSlice[] {
  return shares(apps, labels, (a) => a.platform, hexFor);
}

export function workModeShare(
  apps: ApplicationRow[],
  labels: string[],
  hexFor: (label: string) => string
): ChartSlice[] {
  return shares(apps, labels, (a) => a.workMode, hexFor);
}

const ROLE_TYPE_PALETTE = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"];

export function roleTypeShare(
  apps: ApplicationRow[],
  labels: string[]
): ChartSlice[] {
  const hexFor = (label: string) =>
    ROLE_TYPE_PALETTE[labels.indexOf(label)] ?? "#c7d2fe";
  return shares(apps, labels, (a) => a.roleType, hexFor);
}

export interface WeekPoint {
  week: number; // UTC ms of Monday
  label: string;
  count: number;
}

function mondayUTC(date: Date): number {
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - sinceMonday
  );
}

const WEEK_MS = 7 * 86_400_000;

export function weeklySeries(apps: ApplicationRow[]): WeekPoint[] {
  const counts = new Map<number, number>();
  for (const app of apps) {
    if (!app.dateApplied) continue;
    const date = new Date(app.dateApplied);
    if (isNaN(date.getTime())) continue;
    const week = mondayUTC(date);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }
  if (counts.size === 0) return [];

  const weeks = Array.from(counts.keys());
  const first = Math.min(...weeks);
  const last = Math.max(mondayUTC(new Date()), ...weeks);
  const series: WeekPoint[] = [];
  for (let week = first; week <= last; week += WEEK_MS) {
    series.push({
      week,
      label: new Date(week).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      count: counts.get(week) ?? 0,
    });
  }
  return series;
}

export function upcomingDeadlines(
  apps: ApplicationRow[],
  limit = 5
): ApplicationRow[] {
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return apps
    .filter((a) => {
      if (!a.deadline) return false;
      const d = new Date(a.deadline);
      if (isNaN(d.getTime())) return false;
      const dayUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      return dayUTC >= todayUTC;
    })
    .sort(
      (a, b) =>
        new Date(a.deadline as string).getTime() -
        new Date(b.deadline as string).getTime()
    )
    .slice(0, limit);
}
