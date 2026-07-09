"use client";

import { useRef, useState } from "react";
import { AlertTriangle, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseCsvFile, type ImportRow } from "@/lib/csv";
import { cn } from "@/lib/utils";

type Parsed = { rows: ImportRow[]; missing: string[] };

const PREVIEW_COLS: {
  key: keyof ImportRow["payload"];
  label: string;
}[] = [
  { key: "position", label: "Position" },
  { key: "company", label: "Company" },
  { key: "status", label: "Status" },
  { key: "platform", label: "Platform" },
  { key: "workMode", label: "Work Mode" },
  { key: "roleType", label: "Role" },
];

export function ImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setParsed(null);
    setParsing(false);
    setImporting(false);
    setDragOver(false);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      toast.error("Please choose a .csv file");
      return;
    }
    setParsing(true);
    try {
      const result = await parseCsvFile(file);
      if (result.rows.length === 0) {
        toast.error("That CSV has no data rows");
        setParsing(false);
        return;
      }
      setParsed({ rows: result.rows, missing: result.missing });
    } catch {
      toast.error("Could not parse that CSV file");
    } finally {
      setParsing(false);
    }
  }

  const importable = parsed?.rows.filter((r) => r.errors.length === 0) ?? [];
  const excluded = parsed?.rows.filter((r) => r.errors.length > 0) ?? [];
  const warnedCount = importable.filter((r) => r.warnings.length > 0).length;
  const blockedByColumns = (parsed?.missing.length ?? 0) > 0;

  async function handleImport() {
    if (importable.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/applications/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importable.map((r) => r.payload) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Import failed");
      }
      const data: { created: number; rejected: { index: number }[] } =
        await res.json();
      toast.success(
        `Imported ${data.created} application${data.created === 1 ? "" : "s"}` +
          (data.rejected.length ? ` · ${data.rejected.length} rejected` : "")
      );
      onImported();
      onOpenChange(false);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 rounded-xl p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 pb-4 pt-6">
          <DialogTitle>Import applications from CSV</DialogTitle>
          <DialogDescription>
            Columns are matched to your Excel headers. Review the preview before
            importing.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {!parsed ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              )}
            >
              {parsing ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <UploadCloud
                  className={cn(
                    "h-6 w-6",
                    dragOver ? "text-primary" : "text-muted-foreground"
                  )}
                />
              )}
              <p className="text-sm font-medium">
                Drop a CSV here or click to browse
              </p>
              <p className="max-w-md text-xs text-muted-foreground">
                Expected headers: Position / Title, Company, Role Type,
                Application Status, Work Mode, Tech Stack Required, Skill Match
                %, Interview Round, Salary Min/Max, Date Applied, Platform,
                Deadline, Notes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {blockedByColumns && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Missing required column{parsed.missing.length > 1 ? "s" : ""}:{" "}
                    <strong>{parsed.missing.join(", ")}</strong>. Add{" "}
                    {parsed.missing.length > 1 ? "them" : "it"} and try again.
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-green-100 px-2 py-1 font-medium text-green-700 dark:bg-green-500/15 dark:text-green-300">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  {importable.length} ready
                </span>
                {warnedCount > 0 && (
                  <span className="rounded-md bg-amber-100 px-2 py-1 font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                    {warnedCount} with warnings
                  </span>
                )}
                {excluded.length > 0 && (
                  <span className="rounded-md bg-red-100 px-2 py-1 font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
                    {excluded.length} excluded
                  </span>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2 font-medium">#</th>
                      {PREVIEW_COLS.map((c) => (
                        <th key={c.key} className="px-2 py-2 font-medium">
                          {c.label}
                        </th>
                      ))}
                      <th className="px-2 py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsed.rows.map((row) => {
                      const excludedRow = row.errors.length > 0;
                      return (
                        <tr
                          key={row.index}
                          className={cn(
                            excludedRow && "bg-red-50/60 dark:bg-red-500/5"
                          )}
                        >
                          <td className="px-2 py-1.5 text-xs text-muted-foreground">
                            {row.index}
                          </td>
                          {PREVIEW_COLS.map((c) => (
                            <td
                              key={c.key}
                              className={cn(
                                "max-w-[160px] truncate px-2 py-1.5",
                                row.fieldFlags[c.key] &&
                                  "bg-amber-100/70 dark:bg-amber-500/15"
                              )}
                              title={String(row.payload[c.key] ?? "")}
                            >
                              {String(row.payload[c.key] ?? "—")}
                            </td>
                          ))}
                          <td className="px-2 py-1.5">
                            {excludedRow ? (
                              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                {row.errors.join("; ")}
                              </span>
                            ) : row.warnings.length > 0 ? (
                              <span
                                className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
                                title={row.warnings.join("\n")}
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {row.warnings.length} warning
                                {row.warnings.length > 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  handleFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t bg-muted/30 px-6 py-4">
          {parsed && (
            <Button
              type="button"
              variant="ghost"
              className="mr-auto rounded-lg"
              onClick={reset}
              disabled={importing}
            >
              Choose another file
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="rounded-lg"
            onClick={() => onOpenChange(false)}
            disabled={importing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-lg"
            disabled={
              !parsed || importable.length === 0 || blockedByColumns || importing
            }
            onClick={handleImport}
          >
            {importing && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {parsed
              ? `Import ${importable.length} application${importable.length === 1 ? "" : "s"}`
              : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
