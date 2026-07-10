import type { LookupOptionDTO } from "./lookup-colors";

export interface StatusGroup {
  key: string;
  label: string;
  statuses: string[];
  /** column header accent bar */
  accentBar: string;
  /** count badge tint */
  countBadge: string;
  /** drop-zone highlight when a card is dragged over */
  dropRing: string;
  dropTint: string;
}

// The five pipeline stages are structural (they drive the Kanban columns). Each
// status option carries its group; the visual meta per group lives here.
export const GROUP_ORDER = [
  "Applied",
  "Interviewing",
  "Assessment",
  "Offer",
  "Closed",
] as const;

type GroupMeta = Omit<StatusGroup, "label" | "statuses">;

export const GROUP_META: Record<string, GroupMeta> = {
  Applied: {
    key: "applied",
    accentBar: "bg-blue-500",
    countBadge: "bg-blue-100 text-blue-700",
    dropRing: "ring-blue-400",
    dropTint: "bg-blue-50/70",
  },
  Interviewing: {
    key: "interviewing",
    accentBar: "bg-amber-500",
    countBadge: "bg-amber-100 text-amber-700",
    dropRing: "ring-amber-400",
    dropTint: "bg-amber-50/70",
  },
  Assessment: {
    key: "assessment",
    accentBar: "bg-purple-500",
    countBadge: "bg-purple-100 text-purple-700",
    dropRing: "ring-purple-400",
    dropTint: "bg-purple-50/70",
  },
  Offer: {
    key: "offer",
    accentBar: "bg-green-500",
    countBadge: "bg-green-100 text-green-700",
    dropRing: "ring-green-400",
    dropTint: "bg-green-50/70",
  },
  Closed: {
    key: "closed",
    accentBar: "bg-slate-400",
    countBadge: "bg-slate-100 text-slate-600",
    dropRing: "ring-slate-400",
    dropTint: "bg-slate-50/80",
  },
};

const FALLBACK_META: GroupMeta = {
  key: "other",
  accentBar: "bg-gray-400",
  countBadge: "bg-gray-100 text-gray-700",
  dropRing: "ring-gray-400",
  dropTint: "bg-gray-50/70",
};

/** Build ordered Kanban columns from DB status options grouped by their group. */
export function buildStatusGroups(
  statusOptions: LookupOptionDTO[]
): StatusGroup[] {
  const byGroup = new Map<string, string[]>();
  for (const o of statusOptions) {
    const g = o.group ?? "Applied";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(o.label);
  }
  const known = GROUP_ORDER.filter((g) => byGroup.has(g)) as string[];
  const extras = Array.from(byGroup.keys()).filter(
    (g) => !GROUP_ORDER.includes(g as (typeof GROUP_ORDER)[number])
  );
  return [...known, ...extras].map((label) => {
    const meta = GROUP_META[label] ?? {
      ...FALLBACK_META,
      key: label.toLowerCase().replace(/\s+/g, "-"),
    };
    return { ...meta, label, statuses: byGroup.get(label)! };
  });
}

export function groupForStatusLabel(
  status: string,
  groups: StatusGroup[]
): StatusGroup | undefined {
  return groups.find((g) => g.statuses.includes(status));
}
