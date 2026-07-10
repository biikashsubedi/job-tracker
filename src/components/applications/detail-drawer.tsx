"use client";

import { Calendar, ExternalLink, Pencil, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApplicationDetail, ApplicationRow } from "@/lib/types";
import {
  deadlineState,
  formatDate,
  formatSalaryRange,
} from "@/lib/format";
import {
  PlatformBadge,
  SkillMatchBar,
  StatusPill,
  TechStackChips,
  WorkModeBadge,
} from "./badges";
import { DocumentsSection } from "./documents-section";
import { ViewFilesButton } from "@/components/viewer/view-files-button";
import { useLookups } from "@/components/lookups/lookup-provider";
import { cn } from "@/lib/utils";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function Timeline({ detail }: { detail: ApplicationDetail }) {
  const { colorFor } = useLookups();
  const events = [...detail.statusHistory].reverse(); // newest first
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No history yet.</p>;
  }
  return (
    <ol className="relative space-y-5 border-l border-border pl-5">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            className={cn(
              "absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-card",
              colorFor("STATUS", event.toStatus).dot
            )}
          />
          <div className="text-sm font-medium leading-tight">
            {event.toStatus}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {event.fromStatus ? `from ${event.fromStatus} · ` : ""}
            {new Date(event.changedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </li>
      ))}
    </ol>
  );
}

interface DetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: ApplicationRow | null;
  detail: ApplicationDetail | null; // full record once loaded
  onEdit?: (app: ApplicationRow) => void;
  onDelete?: (app: ApplicationRow) => void;
  /** fired after a document upload/delete so the list/chips can refresh */
  onDocumentsChanged?: () => void;
}

export function DetailDrawer({
  open,
  onOpenChange,
  app,
  detail,
  onEdit,
  onDelete,
  onDocumentsChanged,
}: DetailDrawerProps) {
  if (!app) return null;
  const dlState = deadlineState(app.deadline);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="space-y-3 border-b bg-muted/30 px-6 pb-5 pt-6 text-left">
          <div>
            <SheetTitle className="text-lg leading-tight">
              {app.position}
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-sm">
              {app.company}
            </SheetDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill status={app.status} />
            <WorkModeBadge mode={app.workMode} />
            <PlatformBadge platform={app.platform} />
          </div>
          <ViewFilesButton app={app} variant="full" className="w-full" />
        </SheetHeader>

        <div className="flex-1 space-y-6 px-6 py-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            <Field label="Role Type">{app.roleType}</Field>
            <Field label="Interview Round">
              {app.interviewRound ?? "—"}
            </Field>
            <Field label="Skill Match">
              <SkillMatchBar value={app.skillMatch} />
            </Field>
            <Field label="Salary Range">
              <span className="tabular-nums">
                {formatSalaryRange(app.salaryMin, app.salaryMax)}
              </span>
            </Field>
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
                  (dlState === "soon" || dlState === "overdue") &&
                    "font-medium text-red-600"
                )}
              >
                <Calendar
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground",
                    (dlState === "soon" || dlState === "overdue") &&
                      "text-red-500"
                  )}
                />
                {formatDate(app.deadline)}
                {dlState === "overdue" && (
                  <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-500/20 dark:text-red-300">
                    Overdue
                  </span>
                )}
              </span>
            </Field>
          </div>

          {app.jobUrl && (
            <Field label="Job Posting">
              <a
                href={app.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
              >
                View posting
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Field>
          )}

          {app.techStack && (
            <>
              <Separator />
              <Field label="Tech Stack">
                <TechStackChips techStack={app.techStack} className="mt-1.5" />
              </Field>
            </>
          )}

          {app.notes && (
            <>
              <Separator />
              <Field label="Notes">
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-foreground/90">
                  {app.notes}
                </p>
              </Field>
            </>
          )}

          <Separator />
          <Field label="Documents">
            <DocumentsSection
              applicationId={app.id}
              documents={detail?.documents ?? null}
              onChanged={onDocumentsChanged}
            />
          </Field>

          <Separator />
          <Field label="Status History">
            {detail === null ? (
              <div className="mt-1.5 space-y-2">
                <Skeleton className="h-8 w-2/3 rounded-lg" />
                <Skeleton className="h-8 w-1/2 rounded-lg" />
              </div>
            ) : (
              <div className="mt-2">
                <Timeline detail={detail} />
              </div>
            )}
          </Field>
        </div>

        {(onEdit || onDelete) && (
          <div className="sticky bottom-0 flex gap-2 border-t bg-card/95 px-6 py-4 backdrop-blur">
            {onEdit && (
              <Button
                variant="outline"
                className="flex-1 gap-1.5 rounded-lg"
                onClick={() => onEdit(app)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                className="flex-1 gap-1.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                onClick={() => onDelete(app)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
