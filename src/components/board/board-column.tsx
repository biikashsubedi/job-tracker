"use client";

import { useDroppable } from "@dnd-kit/core";
import { Inbox } from "lucide-react";
import type { ApplicationRow } from "@/lib/types";
import type { StatusGroup } from "@/lib/status-groups";
import { BoardCard } from "./board-card";
import { cn } from "@/lib/utils";

export function BoardColumn({
  group,
  apps,
  onChangeStatus,
}: {
  group: StatusGroup;
  apps: ApplicationRow[];
  onChangeStatus: (app: ApplicationRow, status: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: group.key });

  return (
    <section
      aria-label={`${group.label} column`}
      className="flex max-h-full w-[290px] shrink-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <div className={cn("h-1 shrink-0", group.accentBar)} />
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
        <h2 className="text-sm font-semibold tracking-tight">{group.label}</h2>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            group.countBadge
          )}
        >
          {apps.length}
        </span>
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto p-2 transition-colors duration-150",
          isOver && cn("ring-2 ring-inset", group.dropRing, group.dropTint)
        )}
      >
        {apps.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border border-dashed px-3 py-8 text-center transition-colors",
              isOver ? "border-transparent" : "border-border"
            )}
          >
            <Inbox className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              {isOver ? "Drop here" : "No applications"}
            </p>
          </div>
        ) : (
          apps.map((app) => (
            <BoardCard key={app.id} app={app} onChangeStatus={onChangeStatus} />
          ))
        )}
      </div>
    </section>
  );
}
