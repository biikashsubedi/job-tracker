import {
  STATUS_COLORS,
  PLATFORM_COLORS,
  WORK_MODE_COLORS,
  type Status,
  type Platform,
  type WorkMode,
  type StatusColor,
  type BadgeColor,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_FALLBACK: StatusColor = {
  bg: "bg-gray-100 dark:bg-gray-400/15",
  text: "text-gray-700 dark:text-gray-300",
  border: "border-gray-200 dark:border-gray-400/30",
  dot: "bg-gray-400",
  hex: "#9ca3af",
};

const BADGE_FALLBACK: BadgeColor = {
  bg: "bg-gray-100 dark:bg-gray-400/15",
  text: "text-gray-700 dark:text-gray-300",
  hex: "#9ca3af",
};

export function statusColor(status: string): StatusColor {
  return STATUS_COLORS[status as Status] ?? STATUS_FALLBACK;
}

export function StatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const c = statusColor(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        c.bg,
        c.text,
        c.border,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", c.dot)} />
      {status}
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  const c = PLATFORM_COLORS[platform as Platform] ?? BADGE_FALLBACK;
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
        c.bg,
        c.text
      )}
    >
      {platform}
    </span>
  );
}

export function WorkModeBadge({ mode }: { mode: string }) {
  const c = WORK_MODE_COLORS[mode as WorkMode] ?? BADGE_FALLBACK;
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
        c.bg,
        c.text
      )}
    >
      {mode}
    </span>
  );
}

export function SkillMatchBar({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const color =
    value >= 75 ? "bg-green-500" : value >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {value}
      </span>
    </div>
  );
}

export const DOC_KIND_COLORS: Record<string, string> = {
  Resume: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  "Cover Letter":
    "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300",
  "Job Description":
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  Other: "bg-gray-100 text-gray-700 dark:bg-gray-400/15 dark:text-gray-300",
};

export function DocKindBadge({ kind }: { kind: string }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
        DOC_KIND_COLORS[kind] ?? DOC_KIND_COLORS.Other
      )}
    >
      {kind}
    </span>
  );
}

export function TechStackChips({
  techStack,
  className,
}: {
  techStack: string | null;
  className?: string;
}) {
  if (!techStack) return null;
  const items = techStack
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((tech) => (
        <span
          key={tech}
          className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {tech}
        </span>
      ))}
    </div>
  );
}
