"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { colorClasses, LOOKUP_TYPE_META } from "@/lib/lookup-colors";
import { cn } from "@/lib/utils";
import type { AdminLookupRow } from "./types";

export function DeleteOptionDialog({
  row,
  siblings,
  open,
  onOpenChange,
  onDelete,
  onDeactivate,
  busy,
}: {
  row: AdminLookupRow | null;
  /** other options of the same type (reassignment candidates) */
  siblings: AdminLookupRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (row: AdminLookupRow, reassignTo?: string) => void;
  onDeactivate: (row: AdminLookupRow) => void;
  busy: boolean;
}) {
  const [replacement, setReplacement] = useState<string>("");

  useEffect(() => {
    if (open) setReplacement("");
  }, [open]);

  if (!row) return null;
  const meta = LOOKUP_TYPE_META[row.type];
  const inUse = row.usageCount > 0;
  const c = colorClasses(row.color);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete “{row.label}”?</DialogTitle>
          <DialogDescription>
            {inUse ? (
              <>
                <span
                  className={cn(
                    "mr-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                    c.bg,
                    c.text,
                    c.border
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
                  {row.label}
                </span>
                is used by {row.usageCount} application
                {row.usageCount === 1 ? "" : "s"}. Choose a replacement{" "}
                {meta.singular} before deleting.
              </>
            ) : (
              <>This {meta.singular} is not used by any application. This action cannot be undone.</>
            )}
          </DialogDescription>
        </DialogHeader>

        {inUse && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Reassign the {row.usageCount === 1 ? "application" : `${row.usageCount} applications`} to</Label>
              <Select value={replacement} onValueChange={setReplacement}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder={`Choose a ${meta.singular}…`} />
                </SelectTrigger>
                <SelectContent>
                  {siblings.map((s) => {
                    const sc = colorClasses(s.color);
                    return (
                      <SelectItem key={s.id} value={s.label}>
                        <span className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", sc.dot)} />
                          {s.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Prefer to keep history untouched? <strong>Deactivate</strong>{" "}
                instead — the option leaves dropdowns and filters, but existing
                applications keep displaying it.
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {inUse ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-lg sm:mr-auto"
              onClick={() => onDeactivate(row)}
              disabled={busy || !row.isActive}
              title={
                row.isActive ? undefined : "This option is already inactive"
              }
            >
              Deactivate instead
            </Button>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-lg"
              disabled={busy || (inUse && !replacement)}
              onClick={() => onDelete(row, inUse ? replacement : undefined)}
            >
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {inUse ? "Reassign & delete" : "Delete"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
