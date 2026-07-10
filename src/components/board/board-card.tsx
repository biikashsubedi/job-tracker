"use client";

import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { ArrowRightLeft, CalendarClock, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  canViewFiles,
  filesHref,
} from "@/components/viewer/view-files-button";
import type { ApplicationRow } from "@/lib/types";
import {
  daysSinceApplied,
  deadlineState,
  formatDateShort,
} from "@/lib/format";
import { buildStatusGroups } from "@/lib/status-groups";
import { PlatformBadge, SkillMatchBar } from "../applications/badges";
import { useLookups } from "@/components/lookups/lookup-provider";
import { cn } from "@/lib/utils";

function StatusMenu({
  app,
  onChangeStatus,
}: {
  app: ApplicationRow;
  onChangeStatus: (app: ApplicationRow, status: string) => void;
}) {
  const router = useRouter();
  const { options, colorFor } = useLookups();
  const groups = buildStatusGroups(options.STATUS);
  const viewable = canViewFiles(app);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Actions for ${app.position}`}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          // keep pointer events from starting a drag
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-80 w-64 overflow-y-auto rounded-xl"
      >
        <DropdownMenuItem
          disabled={!viewable}
          onSelect={() => router.push(filesHref(app.id))}
          className="gap-2"
        >
          <Eye className="h-3.5 w-3.5" />
          {viewable ? "View Files" : "No documents uploaded"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {groups.map((group, i) => (
          <div key={group.key}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {group.label}
            </DropdownMenuLabel>
            {group.statuses.map((status) => (
              <DropdownMenuItem
                key={status}
                disabled={status === app.status}
                onSelect={() => onChangeStatus(app, status)}
                className="gap-2"
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    colorFor("STATUS", status).dot
                  )}
                />
                {status}
                {status === app.status && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    current
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BoardCardContent({
  app,
  onChangeStatus,
  overlay = false,
}: {
  app: ApplicationRow;
  onChangeStatus?: (app: ApplicationRow, status: string) => void;
  overlay?: boolean;
}) {
  const { colorFor } = useLookups();
  const dlState = deadlineState(app.deadline);
  const urgent = dlState === "soon" || dlState === "overdue";
  const since = daysSinceApplied(app.dateApplied);
  const c = colorFor("STATUS", app.status);

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-3 shadow-sm transition-shadow",
        overlay && "rotate-2 shadow-xl ring-1 ring-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight">
            {app.position}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {app.company}
          </div>
        </div>
        {!overlay && onChangeStatus && (
          <StatusMenu app={app} onChangeStatus={onChangeStatus} />
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[11px] font-medium",
            c.bg,
            c.text,
            c.border
          )}
        >
          <span className={cn("h-1 w-1 shrink-0 rounded-full", c.dot)} />
          <span className="truncate">{app.status}</span>
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <PlatformBadge platform={app.platform} />
        <SkillMatchBar value={app.skillMatch} />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        {app.deadline ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium",
              urgent
                ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                : "bg-muted"
            )}
          >
            <CalendarClock className="h-3 w-3" />
            {dlState === "overdue" ? "Overdue" : formatDateShort(app.deadline)}
          </span>
        ) : (
          <span />
        )}
        {since && <span>{since}</span>}
      </div>
    </article>
  );
}

export function BoardCard({
  app,
  onChangeStatus,
}: {
  app: ApplicationRow;
  onChangeStatus: (app: ApplicationRow, status: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: app.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab touch-manipulation outline-none active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <BoardCardContent app={app} onChangeStatus={onChangeStatus} />
    </div>
  );
}
