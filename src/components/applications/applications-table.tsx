"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApplicationRow } from "@/lib/types";
import { deadlineState, formatDate, formatSalaryRange } from "@/lib/format";
import {
  PlatformBadge,
  SkillMatchBar,
  StatusPill,
  WorkModeBadge,
} from "./badges";
import { cn } from "@/lib/utils";

function DeadlineCell({ deadline }: { deadline: string | null }) {
  const state = deadlineState(deadline);
  if (state === "none") {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        (state === "soon" || state === "overdue") && "font-medium text-red-600"
      )}
    >
      {formatDate(deadline)}
      {state === "overdue" && (
        <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-500/20 dark:text-red-300">
          Overdue
        </span>
      )}
    </span>
  );
}

function RowActions({
  app,
  onEdit,
  onDelete,
  alwaysVisible = false,
}: {
  app: ApplicationRow;
  onEdit: (app: ApplicationRow) => void;
  onDelete: (app: ApplicationRow) => void;
  alwaysVisible?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-0.5",
        !alwaysVisible &&
          "md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={`Edit ${app.position}`}
        onClick={(e) => {
          e.stopPropagation();
          onEdit(app);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-red-600"
        aria-label={`Delete ${app.position}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(app);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

const HEADERS = [
  { label: "Position", className: "" },
  { label: "Status", className: "" },
  { label: "Work Mode", className: "hidden lg:table-cell" },
  { label: "Platform", className: "hidden lg:table-cell" },
  { label: "Skill Match", className: "hidden md:table-cell" },
  { label: "Salary", className: "hidden xl:table-cell" },
  { label: "Applied", className: "hidden xl:table-cell" },
  { label: "Deadline", className: "hidden md:table-cell" },
  { label: "", className: "w-20" },
];

interface TableProps {
  apps: ApplicationRow[];
  onRowClick: (app: ApplicationRow) => void;
  onEdit: (app: ApplicationRow) => void;
  onDelete: (app: ApplicationRow) => void;
}

export function ApplicationsTable({
  apps,
  onRowClick,
  onEdit,
  onDelete,
}: TableProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {HEADERS.map((h, i) => (
                <th key={i} className={cn("px-4 py-3 font-medium", h.className)}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {apps.map((app) => (
              <tr
                key={app.id}
                onClick={() => onRowClick(app)}
                className="group cursor-pointer transition-colors hover:bg-muted/40"
              >
                <td className="px-4 py-3">
                  <div className="font-semibold leading-tight text-foreground">
                    {app.position}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {app.company}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={app.status} />
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <WorkModeBadge mode={app.workMode} />
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <PlatformBadge platform={app.platform} />
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <SkillMatchBar value={app.skillMatch} />
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground xl:table-cell">
                  {formatSalaryRange(app.salaryMin, app.salaryMax)}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground xl:table-cell">
                  {formatDate(app.dateApplied)}
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <DeadlineCell deadline={app.deadline} />
                </td>
                <td className="px-4 py-3">
                  <RowActions app={app} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {apps.map((app) => (
          <div
            key={app.id}
            onClick={() => onRowClick(app)}
            className="cursor-pointer rounded-xl border bg-card p-4 shadow-sm transition-shadow active:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold leading-tight">{app.position}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {app.company}
                </div>
              </div>
              <RowActions
                app={app}
                onEdit={onEdit}
                onDelete={onDelete}
                alwaysVisible
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <StatusPill status={app.status} />
              <WorkModeBadge mode={app.workMode} />
              <PlatformBadge platform={app.platform} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <SkillMatchBar value={app.skillMatch} />
              <span className="tabular-nums">
                {formatSalaryRange(app.salaryMin, app.salaryMax)}
              </span>
              <DeadlineCell deadline={app.deadline} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-muted/40 px-4 py-3">
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-4">
            <div className="w-48 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="hidden h-5 w-16 rounded-md md:block" />
            <Skeleton className="hidden h-5 w-20 rounded-md lg:block" />
            <Skeleton className="hidden h-2 w-16 xl:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
