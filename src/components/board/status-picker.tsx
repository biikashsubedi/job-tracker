"use client";

import { useEffect } from "react";
import type { ApplicationRow } from "@/lib/types";
import type { StatusGroup } from "@/lib/status-groups";
import { statusColor } from "../applications/badges";
import { cn } from "@/lib/utils";

export interface PickerState {
  app: ApplicationRow;
  group: StatusGroup;
  x: number;
  y: number;
}

const PICKER_WIDTH = 240;

export function StatusPicker({
  picker,
  onPick,
  onClose,
}: {
  picker: PickerState | null;
  onPick: (app: ApplicationRow, status: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!picker) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picker, onClose]);

  if (!picker) return null;

  const estimatedHeight = picker.group.statuses.length * 34 + 46;
  const left = Math.max(
    8,
    Math.min(picker.x, window.innerWidth - PICKER_WIDTH - 8)
  );
  const top = Math.max(
    8,
    Math.min(picker.y, window.innerHeight - estimatedHeight - 8)
  );

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        role="menu"
        className="fixed z-50 rounded-xl border bg-popover p-1.5 shadow-lg animate-in fade-in-0 zoom-in-95"
        style={{ left, top, width: PICKER_WIDTH }}
      >
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Move to {picker.group.label} as…
        </p>
        {picker.group.statuses.map((status) => (
          <button
            key={status}
            role="menuitem"
            onClick={() => onPick(picker.app, status)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                statusColor(status).dot
              )}
            />
            <span className="truncate">{status}</span>
          </button>
        ))}
      </div>
    </>
  );
}
