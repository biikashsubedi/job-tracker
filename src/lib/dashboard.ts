import {
  STATUSES,
  PLATFORMS,
  WORK_MODES,
  ROLE_TYPES,
  STATUS_COLORS,
  PLATFORM_COLORS,
  WORK_MODE_COLORS,
  type Status,
} from "./constants";
import { STATUS_GROUPS, groupForStatus } from "./status-groups";
import type { ApplicationRow } from "./types";

// Terminal = the Closed group plus accepted/hired outcomes — nothing left to do.
const CLOSED_STATUSES =
  STATUS_GROUPS.find((g) => g.key === "closed")?.statuses ?? [];
const TERMINAL_STATUSES = new Set<string>([
  ...CLOSED_STATUSES,
  "Offer Accepted / Hired",
  "Hired",
]);

export interface DashboardStats {
  total: number;
  active: number;
  interviewing: number;
  offers: number;
  closed: number;
  responseRate: number;
}

export function computeStats(apps: ApplicationRow[]): DashboardStats {
  const total = apps.length;
  const inGroup = (key: string) =>
    apps.filter((a) => groupForStatus(a.status).key === key).length;
  // "Responded" = progressed past Applied; Ghosted means no response ever came.
  const responded = apps.filter(
    (a) => a.status !== "Applied" && a.status !== "Ghosted"
  ).length;
  return {
    total,
    active: apps.filter((a) => !TERMINAL_STATUSES.has(a.status)).length,
    interviewing: inGroup("interviewing"),
    offers: inGroup("offer"),
    closed: inGroup("closed"),
    responseRate: total === 0 ? 0 : Math.round((responded / total) * 100),
  };
}

export interface ChartSlice {
  name: string;
  value: number;
  fill: string;
  pct: number;
}

function toShares(
  counts: Map<string, number>,
  total: number,
  hexFor: (name: string) => string
): ChartSlice[] {
  return Array.from(counts.entries())
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      fill: hexFor(name),
      pct: total === 0 ? 0 : Math.round((value / total) * 100),
    }));
}

export function statusBreakdown(apps: ApplicationRow[]): ChartSlice[] {
  const counts = new Map<string, number>(STATUSES.map((s) => [s, 0]));
  for (const app of apps) {
    counts.set(app.status, (counts.get(app.status) ?? 0) + 1);
  }
  return toShares(
    counts,
    apps.length,
    (s) => STATUS_COLORS[s as Status]?.hex ?? "#9ca3af"
  );
}

export function platformShare(apps: ApplicationRow[]): ChartSlice[] {
  const counts = new Map<string, number>(PLATFORMS.map((p) => [p, 0]));
  for (const app of apps) {
    counts.set(app.platform, (counts.get(app.platform) ?? 0) + 1);
  }
  return toShares(
    counts,
    apps.length,
    (p) => PLATFORM_COLORS[p as keyof typeof PLATFORM_COLORS]?.hex ?? "#9ca3af"
  );
}

export function workModeShare(apps: ApplicationRow[]): ChartSlice[] {
  const counts = new Map<string, number>(WORK_MODES.map((w) => [w, 0]));
  for (const app of apps) {
    counts.set(app.workMode, (counts.get(app.workMode) ?? 0) + 1);
  }
  return toShares(
    counts,
    apps.length,
    (w) => WORK_MODE_COLORS[w as keyof typeof WORK_MODE_COLORS]?.hex ?? "#9ca3af"
  );
}

const ROLE_TYPE_PALETTE = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"];

export function roleTypeShare(apps: ApplicationRow[]): ChartSlice[] {
  const counts = new Map<string, number>(ROLE_TYPES.map((r) => [r, 0]));
  for (const app of apps) {
    counts.set(app.roleType, (counts.get(app.roleType) ?? 0) + 1);
  }
  return toShares(
    counts,
    apps.length,
    (r) => ROLE_TYPE_PALETTE[ROLE_TYPES.indexOf(r as (typeof ROLE_TYPES)[number])] ?? "#c7d2fe"
  );
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
