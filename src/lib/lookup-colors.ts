// Client-safe color + type module for lookup options. No DB imports here so it
// can be used from client components. The DB access lives in lookups.ts.

export type LookupType =
  | "STATUS"
  | "PLATFORM"
  | "WORK_MODE"
  | "ROLE_TYPE"
  | "INTERVIEW_ROUND";

export const LOOKUP_TYPES: LookupType[] = [
  "STATUS",
  "PLATFORM",
  "WORK_MODE",
  "ROLE_TYPE",
  "INTERVIEW_ROUND",
];

export interface LookupOptionDTO {
  label: string;
  color: string;
  group: string | null;
  /** inactive options stay on existing applications but leave dropdowns/filters */
  isActive: boolean;
}

/** Human-readable name + /system route slug per lookup type. */
export const LOOKUP_TYPE_META: Record<
  LookupType,
  { title: string; singular: string; slug: string }
> = {
  STATUS: { title: "Statuses", singular: "status", slug: "status" },
  PLATFORM: { title: "Platforms", singular: "platform", slug: "platform" },
  WORK_MODE: { title: "Work Modes", singular: "work mode", slug: "work-mode" },
  ROLE_TYPE: { title: "Role Types", singular: "role type", slug: "role-type" },
  INTERVIEW_ROUND: {
    title: "Interview Rounds",
    singular: "interview round",
    slug: "interview-round",
  },
};

export type AllLookups = Record<LookupType, LookupOptionDTO[]>;

export const EMPTY_LOOKUPS: AllLookups = {
  STATUS: [],
  PLATFORM: [],
  WORK_MODE: [],
  ROLE_TYPE: [],
  INTERVIEW_ROUND: [],
};

export interface ColorClasses {
  /** soft "pill" style (status pills) */
  bg: string;
  text: string;
  border: string;
  dot: string;
  /** solid "badge" style (platform / work-mode badges) */
  badgeBg: string;
  badgeText: string;
  /** hex for SVG chart fills */
  hex: string;
}

// Full literal class strings so Tailwind's scanner generates them.
export const COLOR_CLASSES: Record<string, ColorClasses> = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-500/30",
    dot: "bg-blue-500",
    badgeBg: "bg-blue-100 dark:bg-blue-500/15",
    badgeText: "text-blue-800 dark:text-blue-300",
    hex: "#3b82f6",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-500/30",
    dot: "bg-amber-500",
    badgeBg: "bg-amber-100 dark:bg-amber-500/15",
    badgeText: "text-amber-800 dark:text-amber-300",
    hex: "#f59e0b",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-500/15",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-500/30",
    dot: "bg-purple-500",
    badgeBg: "bg-purple-100 dark:bg-purple-500/15",
    badgeText: "text-purple-800 dark:text-purple-300",
    hex: "#a855f7",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-500/15",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-500/30",
    dot: "bg-green-500",
    badgeBg: "bg-green-100 dark:bg-green-500/15",
    badgeText: "text-green-800 dark:text-green-300",
    hex: "#22c55e",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-500/15",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-500/30",
    dot: "bg-red-500",
    badgeBg: "bg-red-100 dark:bg-red-500/15",
    badgeText: "text-red-800 dark:text-red-300",
    hex: "#ef4444",
  },
  slate: {
    bg: "bg-slate-100 dark:bg-slate-400/15",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-400/30",
    dot: "bg-slate-400",
    badgeBg: "bg-slate-100 dark:bg-slate-400/15",
    badgeText: "text-slate-700 dark:text-slate-300",
    hex: "#94a3b8",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-500/30",
    dot: "bg-emerald-500",
    badgeBg: "bg-emerald-100 dark:bg-emerald-500/15",
    badgeText: "text-emerald-800 dark:text-emerald-300",
    hex: "#10b981",
  },
  sky: {
    bg: "bg-sky-50 dark:bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-500/30",
    dot: "bg-sky-500",
    badgeBg: "bg-sky-100 dark:bg-sky-500/15",
    badgeText: "text-sky-800 dark:text-sky-300",
    hex: "#0ea5e9",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-500/15",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-500/30",
    dot: "bg-orange-500",
    badgeBg: "bg-orange-100 dark:bg-orange-500/15",
    badgeText: "text-orange-800 dark:text-orange-300",
    hex: "#f97316",
  },
  pink: {
    bg: "bg-pink-50 dark:bg-pink-500/15",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-500/30",
    dot: "bg-pink-500",
    badgeBg: "bg-pink-100 dark:bg-pink-500/15",
    badgeText: "text-pink-800 dark:text-pink-300",
    hex: "#ec4899",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-500/15",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-500/30",
    dot: "bg-indigo-500",
    badgeBg: "bg-indigo-100 dark:bg-indigo-500/15",
    badgeText: "text-indigo-800 dark:text-indigo-300",
    hex: "#6366f1",
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-500/15",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-500/30",
    dot: "bg-teal-500",
    badgeBg: "bg-teal-100 dark:bg-teal-500/15",
    badgeText: "text-teal-800 dark:text-teal-300",
    hex: "#14b8a6",
  },
  gray: {
    bg: "bg-gray-100 dark:bg-gray-400/15",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-400/30",
    dot: "bg-gray-400",
    badgeBg: "bg-gray-100 dark:bg-gray-400/15",
    badgeText: "text-gray-700 dark:text-gray-300",
    hex: "#9ca3af",
  },
};

export const LOOKUP_COLOR_NAMES = Object.keys(COLOR_CLASSES);

export function colorClasses(name: string | undefined): ColorClasses {
  return (name && COLOR_CLASSES[name]) || COLOR_CLASSES.gray;
}
