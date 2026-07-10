"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  colorClasses,
  LOOKUP_COLOR_NAMES,
  LOOKUP_TYPE_META,
  type LookupType,
} from "@/lib/lookup-colors";
import { GROUP_ORDER } from "@/lib/status-groups";
import { cn } from "@/lib/utils";
import type { AdminLookupRow } from "./types";

export interface OptionDraft {
  label: string;
  color: string;
  group: string | null;
}

export function OptionDialog({
  type,
  editing, // null → create
  existingLabels,
  open,
  onOpenChange,
  onSubmit,
  submitting,
  serverError,
}: {
  type: LookupType;
  editing: AdminLookupRow | null;
  existingLabels: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** resolves when saved; the manager owns the API call + rename confirm */
  onSubmit: (draft: OptionDraft) => void;
  submitting: boolean;
  serverError: string | null;
}) {
  const meta = LOOKUP_TYPE_META[type];
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("blue");
  const [group, setGroup] = useState<string>("Applied");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(editing?.label ?? "");
      setColor(editing?.color ?? "blue");
      setGroup(editing?.group ?? "Applied");
      setTouched(false);
    }
  }, [open, editing]);

  const trimmed = label.trim();
  const duplicate = useMemo(() => {
    const lower = trimmed.toLowerCase();
    return existingLabels.some(
      (l) =>
        l.toLowerCase() === lower &&
        l.toLowerCase() !== (editing?.label ?? "").toLowerCase()
    );
  }, [trimmed, existingLabels, editing]);

  const inlineError = !trimmed
    ? touched
      ? "Label is required"
      : null
    : duplicate
      ? `A ${meta.singular} named "${trimmed}" already exists`
      : null;

  const c = colorClasses(color);

  function submit() {
    setTouched(true);
    if (!trimmed || duplicate) return;
    onSubmit({
      label: trimmed,
      color,
      group: type === "STATUS" ? group : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Edit ${meta.singular}` : `Add ${meta.singular}`}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Changes apply everywhere this option is shown."
              : `New options appear in dropdowns and filters immediately.`}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="option-label">Label</Label>
            <Input
              id="option-label"
              value={label}
              autoFocus
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={`e.g. ${type === "STATUS" ? "Phone Screen" : type === "PLATFORM" ? "Wellfound" : "…"}`}
              aria-invalid={!!inlineError}
              className={cn(
                "rounded-lg",
                inlineError && "border-red-400 focus-visible:ring-red-400"
              )}
            />
            {(inlineError || serverError) && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                {inlineError ?? serverError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="grid grid-cols-7 gap-2">
              {LOOKUP_COLOR_NAMES.map((name) => {
                const cc = colorClasses(name);
                const selected = name === color;
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    aria-label={`Color ${name}`}
                    aria-pressed={selected}
                    onClick={() => setColor(name)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border transition-transform hover:scale-110",
                      cc.bg,
                      cc.border,
                      selected && "ring-2 ring-ring ring-offset-2 ring-offset-background"
                    )}
                  >
                    <span className={cn("h-3.5 w-3.5 rounded-full", cc.dot)} />
                  </button>
                );
              })}
            </div>
          </div>

          {type === "STATUS" && (
            <div className="space-y-1.5">
              <Label>Pipeline group</Label>
              <Select value={group} onValueChange={setGroup}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_ORDER.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* live preview */}
          <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
                c.bg,
                c.text,
                c.border
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
              {trimmed || "Option label"}
            </span>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-lg"
              disabled={submitting || !trimmed || duplicate}
            >
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add option"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
