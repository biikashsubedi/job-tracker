"use client";

import { Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApplicationRow } from "@/lib/types";
import { deadlineState, formatDate, formatSalaryRange } from "@/lib/format";
import {
  PlatformBadge,
  SkillMatchBar,
  StatusPill,
  TechStackChips,
  WorkModeBadge,
} from "@/components/applications/badges";
import { cn } from "@/lib/utils";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

export function ViewerSidePanel({
  app,
  className,
  onClose,
}: {
  app: ApplicationRow;
  className?: string;
  onClose?: () => void;
}) {
  const dl = deadlineState(app.deadline);
  const dlUrgent = dl === "soon" || dl === "overdue";

  return (
    <aside className={cn("flex flex-col overflow-hidden bg-card", className)}>
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Job details</h2>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Close details"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <Field label="Status">
          <StatusPill status={app.status} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Platform">
            <PlatformBadge platform={app.platform} />
          </Field>
          <Field label="Work Mode">
            <WorkModeBadge mode={app.workMode} />
          </Field>
          <Field label="Role Type">{app.roleType}</Field>
          <Field label="Interview Round">{app.interviewRound ?? "—"}</Field>
        </div>

        <Field label="Skill Match">
          <SkillMatchBar value={app.skillMatch} />
        </Field>

        <Field label="Salary Range">
          <span className="tabular-nums">
            {formatSalaryRange(app.salaryMin, app.salaryMax)}
          </span>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date Applied">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {formatDate(app.dateApplied)}
            </span>
          </Field>
          <Field label="Deadline">
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                dlUrgent && "font-medium text-red-600 dark:text-red-400"
              )}
            >
              <Calendar
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground",
                  dlUrgent && "text-red-500"
                )}
              />
              {formatDate(app.deadline)}
            </span>
          </Field>
        </div>

        {app.techStack && (
          <Field label="Tech Stack">
            <TechStackChips techStack={app.techStack} className="mt-1.5" />
          </Field>
        )}

        {app.notes && (
          <Field label="Notes">
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-foreground/90">
              {app.notes}
            </p>
          </Field>
        )}
      </div>
    </aside>
  );
}
