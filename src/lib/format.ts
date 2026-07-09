const compact = (n: number) =>
  n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;

export function formatSalaryRange(
  min: number | null | undefined,
  max: number | null | undefined
): string {
  if (min != null && max != null) return `${compact(min)}–${compact(max)}`;
  if (min != null) return `${compact(min)}+`;
  if (max != null) return `Up to ${compact(max)}`;
  return "—";
}

// Dates are stored as UTC midnight; format in UTC so they don't shift a day
// in western timezones.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export type DeadlineState = "none" | "normal" | "soon" | "overdue";

export function deadlineState(iso: string | null | undefined): DeadlineState {
  if (!iso) return "none";
  const deadline = new Date(iso);
  if (isNaN(deadline.getTime())) return "none";
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineUTC = Date.UTC(
    deadline.getUTCFullYear(),
    deadline.getUTCMonth(),
    deadline.getUTCDate()
  );
  const diffDays = Math.round((deadlineUTC - todayUTC) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "soon";
  return "normal";
}

/** "Today" / "3d ago" since the applied date, or null if unknown */
export function daysSinceApplied(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const applied = new Date(iso);
  if (isNaN(applied.getTime())) return null;
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const appliedUTC = Date.UTC(
    applied.getUTCFullYear(),
    applied.getUTCMonth(),
    applied.getUTCDate()
  );
  const diffDays = Math.floor((todayUTC - appliedUTC) / 86_400_000);
  if (diffDays <= 0) return "Today";
  return `${diffDays}d ago`;
}

/** Whole days from today until the date (negative = past), or null */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dayUTC = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  return Math.round((dayUTC - todayUTC) / 86_400_000);
}

/** Short date without year, e.g. "Jul 11" */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** ISO datetime → value for <input type="date"> */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

/** ISO datetime → YYYY-MM-DD for CSV export (UTC, stable across timezones) */
export function formatDateForCsv(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}
