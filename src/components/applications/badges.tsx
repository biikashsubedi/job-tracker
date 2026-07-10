"use client";

import type { DocumentSummary } from "@/lib/types";
import { useLookups } from "@/components/lookups/lookup-provider";
import { cn } from "@/lib/utils";

// Deactivated options keep displaying on existing applications, but muted.
const INACTIVE_PILL =
  "border-dashed border-border bg-muted/60 text-muted-foreground opacity-80";
const INACTIVE_BADGE = "bg-muted/60 text-muted-foreground opacity-80";
const INACTIVE_TITLE = "This option is inactive";

export function StatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const { colorFor, isInactive } = useLookups();
  const c = colorFor("STATUS", status);
  const inactive = isInactive("STATUS", status);
  return (
    <span
      title={inactive ? INACTIVE_TITLE : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        inactive ? INACTIVE_PILL : [c.bg, c.text, c.border],
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          inactive ? "bg-muted-foreground/50" : c.dot
        )}
      />
      {status}
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  const { colorFor, isInactive } = useLookups();
  const c = colorFor("PLATFORM", platform);
  const inactive = isInactive("PLATFORM", platform);
  return (
    <span
      title={inactive ? INACTIVE_TITLE : undefined}
      className={cn(
        "inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
        inactive ? INACTIVE_BADGE : [c.badgeBg, c.badgeText]
      )}
    >
      {platform}
    </span>
  );
}

export function WorkModeBadge({ mode }: { mode: string }) {
  const { colorFor, isInactive } = useLookups();
  const c = colorFor("WORK_MODE", mode);
  const inactive = isInactive("WORK_MODE", mode);
  return (
    <span
      title={inactive ? INACTIVE_TITLE : undefined}
      className={cn(
        "inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
        inactive ? INACTIVE_BADGE : [c.badgeBg, c.badgeText]
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

function DocChip({
  label,
  present,
  tone,
  title,
}: {
  label: string;
  present: boolean;
  tone: "green" | "blue";
  title: string;
}) {
  const presentClasses =
    tone === "green"
      ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
      : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
  return (
    <span
      title={title}
      className={cn(
        "inline-flex cursor-default items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        present
          ? presentClasses
          : "border border-dashed border-border text-muted-foreground/60"
      )}
    >
      {label}
    </span>
  );
}

/** "CV" / "CL" indicator chips for the applications table. */
export function DocIndicatorChips({
  documents,
}: {
  documents?: DocumentSummary[];
}) {
  const resume = documents?.find((d) => d.kind === "Resume");
  const cover = documents?.find((d) => d.kind === "Cover Letter");
  return (
    <div className="flex items-center gap-1">
      <DocChip
        label="CV"
        present={!!resume}
        tone="green"
        title={
          resume
            ? `Resume uploaded · ${resume.filename}`
            : "No resume attached"
        }
      />
      <DocChip
        label="CL"
        present={!!cover}
        tone="blue"
        title={
          cover
            ? `Cover letter uploaded · ${cover.filename}`
            : "No cover letter attached"
        }
      />
    </div>
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
