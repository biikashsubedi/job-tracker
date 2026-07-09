export const STATUSES = [
  "Applied",
  "Initial Interview",
  "Technical Interview",
  "Take-home Assessment",
  "Final Interview",
  "Interviewing",
  "Awaiting Interview — Hiring Manager",
  "Awaiting Client Offer",
  "Job Offer",
  "Contract Signing",
  "Offer Accepted / Hired",
  "Hired",
  "Offered Another Position",
  "Declined Offer",
  "Withdrew",
  "Ghosted",
  "Position Filled / Rejected",
  "Hiring Application Closed",
] as const;

export type Status = (typeof STATUSES)[number];

export const ROLE_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Freelance",
  "Internship",
] as const;

export type RoleType = (typeof ROLE_TYPES)[number];

export const WORK_MODES = ["Remote", "Hybrid", "On-site", "N/A"] as const;

export type WorkMode = (typeof WORK_MODES)[number];

export const PLATFORMS = [
  "LinkedIn",
  "Company Site",
  "JobStreet",
  "Indeed",
  "Kalibrr",
  "Referral",
  "HR Portal",
  "Other",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const INTERVIEW_ROUNDS = [
  "None",
  "Round 1",
  "Round 2",
  "Round 3",
  "Final Round",
  "Offer Stage",
] as const;

export type InterviewRound = (typeof INTERVIEW_ROUNDS)[number];

export const DOCUMENT_KINDS = [
  "Resume",
  "Cover Letter",
  "Job Description",
  "Other",
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export interface StatusColor {
  bg: string;
  text: string;
  border: string;
  dot: string;
  /** hex for SVG chart fills */
  hex: string;
}

const BLUE: StatusColor = {
  bg: "bg-blue-50 dark:bg-blue-500/15",
  text: "text-blue-700 dark:text-blue-300",
  border: "border-blue-200 dark:border-blue-500/30",
  dot: "bg-blue-500",
  hex: "#3b82f6",
};

const AMBER: StatusColor = {
  bg: "bg-amber-50 dark:bg-amber-500/15",
  text: "text-amber-700 dark:text-amber-300",
  border: "border-amber-200 dark:border-amber-500/30",
  dot: "bg-amber-500",
  hex: "#f59e0b",
};

const PURPLE: StatusColor = {
  bg: "bg-purple-50 dark:bg-purple-500/15",
  text: "text-purple-700 dark:text-purple-300",
  border: "border-purple-200 dark:border-purple-500/30",
  dot: "bg-purple-500",
  hex: "#a855f7",
};

const GREEN: StatusColor = {
  bg: "bg-green-50 dark:bg-green-500/15",
  text: "text-green-700 dark:text-green-300",
  border: "border-green-200 dark:border-green-500/30",
  dot: "bg-green-500",
  hex: "#22c55e",
};

const SLATE: StatusColor = {
  bg: "bg-slate-100 dark:bg-slate-400/15",
  text: "text-slate-600 dark:text-slate-300",
  border: "border-slate-200 dark:border-slate-400/30",
  dot: "bg-slate-400",
  hex: "#94a3b8",
};

const RED: StatusColor = {
  bg: "bg-red-50 dark:bg-red-500/15",
  text: "text-red-700 dark:text-red-300",
  border: "border-red-200 dark:border-red-500/30",
  dot: "bg-red-500",
  hex: "#ef4444",
};

export const STATUS_COLORS: Record<Status, StatusColor> = {
  // Blue — applied/early
  Applied: BLUE,
  // Amber — interviewing
  "Initial Interview": AMBER,
  "Technical Interview": AMBER,
  "Final Interview": AMBER,
  Interviewing: AMBER,
  "Awaiting Interview — Hiring Manager": AMBER,
  // Purple — assessment/waiting
  "Take-home Assessment": PURPLE,
  "Awaiting Client Offer": PURPLE,
  // Green — offer/success
  "Job Offer": GREEN,
  "Contract Signing": GREEN,
  "Offer Accepted / Hired": GREEN,
  Hired: GREEN,
  // Slate — neutral exits
  "Offered Another Position": SLATE,
  Withdrew: SLATE,
  Ghosted: SLATE,
  // Red — closed/rejected
  "Declined Offer": RED,
  "Position Filled / Rejected": RED,
  "Hiring Application Closed": RED,
};

export interface BadgeColor {
  bg: string;
  text: string;
  /** hex for SVG chart fills */
  hex: string;
}

export const PLATFORM_COLORS: Record<Platform, BadgeColor> = {
  LinkedIn: { bg: "bg-sky-100 dark:bg-sky-500/15", text: "text-sky-800 dark:text-sky-300", hex: "#0ea5e9" },
  "Company Site": { bg: "bg-indigo-100 dark:bg-indigo-500/15", text: "text-indigo-800 dark:text-indigo-300", hex: "#6366f1" },
  JobStreet: { bg: "bg-violet-100 dark:bg-violet-500/15", text: "text-violet-800 dark:text-violet-300", hex: "#8b5cf6" },
  Indeed: { bg: "bg-blue-100 dark:bg-blue-500/15", text: "text-blue-800 dark:text-blue-300", hex: "#3b82f6" },
  Kalibrr: { bg: "bg-teal-100 dark:bg-teal-500/15", text: "text-teal-800 dark:text-teal-300", hex: "#14b8a6" },
  Referral: { bg: "bg-rose-100 dark:bg-rose-500/15", text: "text-rose-800 dark:text-rose-300", hex: "#f43f5e" },
  "HR Portal": { bg: "bg-amber-100 dark:bg-amber-500/15", text: "text-amber-800 dark:text-amber-300", hex: "#f59e0b" },
  Other: { bg: "bg-gray-100 dark:bg-gray-400/15", text: "text-gray-700 dark:text-gray-300", hex: "#9ca3af" },
};

export const WORK_MODE_COLORS: Record<WorkMode, BadgeColor> = {
  Remote: { bg: "bg-emerald-100 dark:bg-emerald-500/15", text: "text-emerald-800 dark:text-emerald-300", hex: "#10b981" },
  Hybrid: { bg: "bg-sky-100 dark:bg-sky-500/15", text: "text-sky-800 dark:text-sky-300", hex: "#0ea5e9" },
  "On-site": { bg: "bg-orange-100 dark:bg-orange-500/15", text: "text-orange-800 dark:text-orange-300", hex: "#f97316" },
  "N/A": { bg: "bg-gray-100 dark:bg-gray-400/15", text: "text-gray-700 dark:text-gray-300", hex: "#9ca3af" },
};
