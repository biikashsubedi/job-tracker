import type { Status } from "./constants";

export interface StatusGroup {
  key: string;
  label: string;
  statuses: Status[];
  /** column header accent bar */
  accentBar: string;
  /** count badge tint */
  countBadge: string;
  /** drop-zone highlight when a card is dragged over */
  dropRing: string;
  dropTint: string;
}

// Groups follow the color families in constants.ts; the slate (neutral exits)
// and red (closed/rejected) families share the "Closed" column.
export const STATUS_GROUPS: StatusGroup[] = [
  {
    key: "applied",
    label: "Applied",
    statuses: ["Applied"],
    accentBar: "bg-blue-500",
    countBadge: "bg-blue-100 text-blue-700",
    dropRing: "ring-blue-400",
    dropTint: "bg-blue-50/70",
  },
  {
    key: "interviewing",
    label: "Interviewing",
    statuses: [
      "Initial Interview",
      "Technical Interview",
      "Final Interview",
      "Interviewing",
      "Awaiting Interview — Hiring Manager",
    ],
    accentBar: "bg-amber-500",
    countBadge: "bg-amber-100 text-amber-700",
    dropRing: "ring-amber-400",
    dropTint: "bg-amber-50/70",
  },
  {
    key: "assessment",
    label: "Assessment",
    statuses: ["Take-home Assessment", "Awaiting Client Offer"],
    accentBar: "bg-purple-500",
    countBadge: "bg-purple-100 text-purple-700",
    dropRing: "ring-purple-400",
    dropTint: "bg-purple-50/70",
  },
  {
    key: "offer",
    label: "Offer",
    statuses: ["Job Offer", "Contract Signing", "Offer Accepted / Hired", "Hired"],
    accentBar: "bg-green-500",
    countBadge: "bg-green-100 text-green-700",
    dropRing: "ring-green-400",
    dropTint: "bg-green-50/70",
  },
  {
    key: "closed",
    label: "Closed",
    statuses: [
      "Offered Another Position",
      "Withdrew",
      "Ghosted",
      "Declined Offer",
      "Position Filled / Rejected",
      "Hiring Application Closed",
    ],
    accentBar: "bg-slate-400",
    countBadge: "bg-slate-100 text-slate-600",
    dropRing: "ring-slate-400",
    dropTint: "bg-slate-50/80",
  },
];

export function groupForStatus(status: string): StatusGroup {
  return (
    STATUS_GROUPS.find((g) => g.statuses.includes(status as Status)) ??
    STATUS_GROUPS[0]
  );
}
