"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, Plus, UploadCloud, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildApplicationSchemas } from "@/lib/validation";
import type { ApplicationPayload, ApplicationRow } from "@/lib/types";
import { toDateInputValue } from "@/lib/format";
import {
  SLOT_ACCEPT,
  extensionOf,
  formatBytes,
  validateSlotFile,
  validateUpload,
} from "@/lib/documents";
import { uploadDocument } from "@/lib/upload-client";
import { useLookups } from "@/components/lookups/lookup-provider";
import { cn } from "@/lib/utils";

const EXT_ICON_COLOR: Record<string, string> = {
  pdf: "text-red-500",
  docx: "text-blue-500",
  txt: "text-slate-500",
};

interface FormValues {
  position: string;
  company: string;
  roleType: string;
  status: string;
  workMode: string;
  platform: string;
  interviewRound: string;
  techStack: string;
  skillMatch: number;
  salaryMin: string;
  salaryMax: string;
  dateApplied: string;
  deadline: string;
  jobUrl: string;
  notes: string;
}

const DEFAULT_VALUES: FormValues = {
  position: "",
  company: "",
  roleType: "Full-time",
  status: "Applied",
  workMode: "Remote",
  platform: "LinkedIn",
  interviewRound: "None",
  techStack: "",
  skillMatch: 50,
  salaryMin: "",
  salaryMax: "",
  dateApplied: "",
  deadline: "",
  jobUrl: "",
  notes: "",
};

interface OtherDoc {
  id: string;
  file: File;
  kind: string;
}

interface UploadItem {
  key: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
}

/** Today's date as a YYYY-MM-DD string in the user's local timezone. */
function todayInputValue(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function valuesFromApp(app: ApplicationRow): FormValues {
  return {
    position: app.position,
    company: app.company,
    roleType: app.roleType,
    status: app.status,
    workMode: app.workMode,
    platform: app.platform,
    interviewRound: app.interviewRound ?? "None",
    techStack: app.techStack ?? "",
    skillMatch: app.skillMatch ?? 50,
    salaryMin: app.salaryMin != null ? String(app.salaryMin) : "",
    salaryMax: app.salaryMax != null ? String(app.salaryMax) : "",
    dateApplied: toDateInputValue(app.dateApplied),
    deadline: toDateInputValue(app.deadline),
    jobUrl: app.jobUrl ?? "",
    notes: app.notes ?? "",
  };
}

function buildPayload(values: FormValues): ApplicationPayload {
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  return {
    position: values.position.trim(),
    company: values.company.trim(),
    roleType: values.roleType,
    status: values.status,
    workMode: values.workMode,
    platform: values.platform,
    interviewRound: values.interviewRound || null,
    techStack: values.techStack.trim() || null,
    skillMatch: values.skillMatch,
    salaryMin: num(values.salaryMin),
    salaryMax: num(values.salaryMax),
    dateApplied: values.dateApplied || null,
    deadline: values.deadline || null,
    jobUrl: values.jobUrl.trim() || null,
    notes: values.notes.trim() || null,
  };
}

/** Warning toast (app already saved) offering to retry a failed upload. */
function scheduleRetryToast(
  appId: string,
  file: File,
  kind: string,
  onDone?: () => void
) {
  toast.warning(`Couldn't upload "${file.name}"`, {
    description: "Your application was saved — retry the upload?",
    duration: 12000,
    action: {
      label: "Retry",
      onClick: async () => {
        const id = toast.loading(`Retrying "${file.name}"…`);
        try {
          await uploadDocument(appId, file, kind);
          toast.success(`Uploaded "${file.name}"`, { id });
          onDone?.();
        } catch {
          toast.error(`Still couldn't upload "${file.name}"`, { id });
          scheduleRetryToast(appId, file, kind, onDone);
        }
      },
    },
  });
}

export type SubmitResult =
  | { ok: true; app: ApplicationRow }
  | { ok: false; fieldErrors?: Record<string, string> };

interface ApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ApplicationRow | null;
  onSubmit: (payload: ApplicationPayload) => Promise<SubmitResult>;
  /** called after document uploads settle so the list can refresh */
  onDocumentsUploaded?: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function FileIcon({ name }: { name: string }) {
  return (
    <FileText
      className={cn(
        "h-4 w-4 shrink-0",
        EXT_ICON_COLOR[extensionOf(name)] ?? "text-muted-foreground"
      )}
    />
  );
}

/** A dedicated Resume / Cover Letter slot: drop zone, selected file, or existing file. */
function DocSlot({
  title,
  file,
  existingName,
  onSelect,
  onClear,
  disabled,
}: {
  title: string;
  file: File | null;
  existingName: string | null;
  onSelect: (f: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = () => inputRef.current?.click();
  const accept = (f?: File) => {
    if (!f) return;
    const err = validateSlotFile(f.name, f.type, f.size);
    if (err) {
      toast.error(err);
      return;
    }
    onSelect(f);
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        {title}
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) accept(e.dataTransfer.files?.[0]);
        }}
      >
        {file ? (
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
            <FileIcon name={file.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={file.name}>
                {file.name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatBytes(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              aria-label={`Remove ${file.name}`}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : existingName ? (
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
            <FileIcon name={existingName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={existingName}>
                {existingName}
              </p>
              <p className="text-[11px] text-muted-foreground">Current file</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-md text-xs"
              onClick={pick}
              disabled={disabled}
            >
              Replace
            </Button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label={`Upload ${title}`}
            onClick={pick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") pick();
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-3 py-5 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            )}
          >
            <UploadCloud
              className={cn(
                "h-5 w-5",
                dragOver ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span className="text-xs font-medium">Drop or click to upload</span>
            <span className="text-[11px] text-muted-foreground">
              PDF or DOCX
            </span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={SLOT_ACCEPT}
        className="hidden"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function ApplicationForm({
  open,
  onOpenChange,
  editing,
  onSubmit,
  onDocumentsUploaded,
}: ApplicationFormProps) {
  const { options, colorFor } = useLookups();
  const lookupValues = useMemo(
    () => ({
      status: options.STATUS.map((o) => o.label),
      roleType: options.ROLE_TYPE.map((o) => o.label),
      workMode: options.WORK_MODE.map((o) => o.label),
      platform: options.PLATFORM.map((o) => o.label),
      interviewRound: options.INTERVIEW_ROUND.map((o) => o.label),
    }),
    [options]
  );

  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [otherDocs, setOtherDocs] = useState<OtherDoc[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const otherInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValues(
        editing
          ? valuesFromApp(editing)
          : // New applications default Date Applied to today.
            { ...DEFAULT_VALUES, dateApplied: todayInputValue() }
      );
      setErrors({});
      setSubmitting(false);
      setCoverFile(null);
      setResumeFile(null);
      setOtherDocs([]);
      setUploads([]);
    }
  }, [open, editing]);

  const existingResume =
    editing?.documents?.find(
      (d) => d.kind === "Resume" && d.isActive !== false
    ) ?? null;
  const existingCover =
    editing?.documents?.find(
      (d) => d.kind === "Cover Letter" && d.isActive !== false
    ) ?? null;

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  function addOther(file?: File) {
    if (!file) return;
    // extra docs default to Job Description, which accepts any file type
    const err = validateUpload(file.name, file.type, file.size, "Job Description");
    if (err) {
      toast.error(err);
      return;
    }
    setOtherDocs((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, file, kind: "Job Description" },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = buildPayload(values);

    const { create } = buildApplicationSchemas(lookupValues);
    const parsed = create.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const result = await onSubmit(payload);
    if (!result.ok) {
      setSubmitting(false);
      if (result.fieldErrors) setErrors(result.fieldErrors);
      return;
    }

    // Application saved. Now upload any attached documents.
    const appId = result.app.id;
    const queue: { key: string; file: File; kind: string }[] = [];
    if (resumeFile) queue.push({ key: "resume", file: resumeFile, kind: "Resume" });
    if (coverFile)
      queue.push({ key: "cover", file: coverFile, kind: "Cover Letter" });
    for (const d of otherDocs)
      queue.push({ key: `other-${d.id}`, file: d.file, kind: d.kind });

    if (queue.length === 0) {
      setSubmitting(false);
      onOpenChange(false);
      return;
    }

    setUploads(
      queue.map((q) => ({
        key: q.key,
        name: q.file.name,
        progress: 0,
        status: "uploading" as const,
      }))
    );

    const failures: { file: File; kind: string }[] = [];
    for (const item of queue) {
      try {
        await uploadDocument(appId, item.file, item.kind, (pct) =>
          setUploads((prev) =>
            prev.map((u) =>
              u.key === item.key ? { ...u, progress: pct } : u
            )
          )
        );
        setUploads((prev) =>
          prev.map((u) =>
            u.key === item.key ? { ...u, progress: 100, status: "done" } : u
          )
        );
      } catch {
        setUploads((prev) =>
          prev.map((u) =>
            u.key === item.key ? { ...u, status: "error" } : u
          )
        );
        failures.push({ file: item.file, kind: item.kind });
      }
    }

    setSubmitting(false);
    // App is saved regardless of upload outcome.
    onDocumentsUploaded?.();
    onOpenChange(false);
    for (const f of failures) {
      scheduleRetryToast(appId, f.file, f.kind, onDocumentsUploaded);
    }
  }

  return (
    <Dialog open={open} onOpenChange={submitting ? undefined : onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 rounded-xl p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 pb-4 pt-6">
          <DialogTitle>
            {editing ? "Edit Application" : "Add Application"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? `Update the details for ${editing.position} at ${editing.company}.`
              : "Track a new job application in your pipeline."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="grid flex-1 gap-x-4 gap-y-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="position">Position *</Label>
              <Input
                id="position"
                value={values.position}
                onChange={(e) => set("position", e.target.value)}
                placeholder="e.g. Machine Learning Engineer"
                className="mt-1.5 rounded-lg"
              />
              <FieldError message={errors.position} />
            </div>
            <div>
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={values.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="e.g. Cohere"
                className="mt-1.5 rounded-lg"
              />
              <FieldError message={errors.company} />
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={values.status}
                onValueChange={(v) => set("status", v)}
              >
                <SelectTrigger className="mt-1.5 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.STATUS.map((s) => (
                    <SelectItem key={s.label} value={s.label}>
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            colorFor("STATUS", s.label).dot
                          )}
                        />
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.status} />
            </div>
            <div>
              <Label>Role Type</Label>
              <Select
                value={values.roleType}
                onValueChange={(v) => set("roleType", v)}
              >
                <SelectTrigger className="mt-1.5 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.ROLE_TYPE.map((r) => (
                    <SelectItem key={r.label} value={r.label}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.roleType} />
            </div>

            <div>
              <Label>Work Mode</Label>
              <Select
                value={values.workMode}
                onValueChange={(v) => set("workMode", v)}
              >
                <SelectTrigger className="mt-1.5 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.WORK_MODE.map((w) => (
                    <SelectItem key={w.label} value={w.label}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.workMode} />
            </div>
            <div>
              <Label>Platform</Label>
              <Select
                value={values.platform}
                onValueChange={(v) => set("platform", v)}
              >
                <SelectTrigger className="mt-1.5 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.PLATFORM.map((p) => (
                    <SelectItem key={p.label} value={p.label}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.platform} />
            </div>

            <div>
              <Label>Interview Round</Label>
              <Select
                value={values.interviewRound}
                onValueChange={(v) => set("interviewRound", v)}
              >
                <SelectTrigger className="mt-1.5 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.INTERVIEW_ROUND.map((r) => (
                    <SelectItem key={r.label} value={r.label}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.interviewRound} />
            </div>
            <div>
              <Label htmlFor="techStack">Tech Stack</Label>
              <Input
                id="techStack"
                value={values.techStack}
                onChange={(e) => set("techStack", e.target.value)}
                placeholder="Python, PyTorch, SQL (comma-separated)"
                className="mt-1.5 rounded-lg"
              />
              <FieldError message={errors.techStack} />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Skill Match</Label>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums">
                  {values.skillMatch}%
                </span>
              </div>
              <Slider
                value={[values.skillMatch]}
                onValueChange={([v]) => set("skillMatch", v)}
                min={0}
                max={100}
                step={1}
                className="mt-3"
              />
              <FieldError message={errors.skillMatch} />
            </div>

            <div>
              <Label htmlFor="salaryMin">Salary Min ($/yr)</Label>
              <Input
                id="salaryMin"
                type="number"
                min={0}
                value={values.salaryMin}
                onChange={(e) => set("salaryMin", e.target.value)}
                placeholder="80000"
                className="mt-1.5 rounded-lg"
              />
              <FieldError message={errors.salaryMin} />
            </div>
            <div>
              <Label htmlFor="salaryMax">Salary Max ($/yr)</Label>
              <Input
                id="salaryMax"
                type="number"
                min={0}
                value={values.salaryMax}
                onChange={(e) => set("salaryMax", e.target.value)}
                placeholder="120000"
                className="mt-1.5 rounded-lg"
              />
              <FieldError message={errors.salaryMax} />
            </div>

            <div>
              <Label htmlFor="dateApplied">Date Applied</Label>
              <Input
                id="dateApplied"
                type="date"
                value={values.dateApplied}
                onChange={(e) => set("dateApplied", e.target.value)}
                className="mt-1.5 rounded-lg"
              />
              <FieldError message={errors.dateApplied} />
            </div>
            <div>
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={values.deadline}
                onChange={(e) => set("deadline", e.target.value)}
                className="mt-1.5 rounded-lg"
              />
              <FieldError message={errors.deadline} />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="jobUrl">Job URL</Label>
              <Input
                id="jobUrl"
                type="url"
                value={values.jobUrl}
                onChange={(e) => set("jobUrl", e.target.value)}
                placeholder="https://…"
                className="mt-1.5 rounded-lg"
              />
              <FieldError message={errors.jobUrl} />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={values.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Recruiter contacts, prep notes, next steps…"
                rows={3}
                className="mt-1.5 rounded-lg"
              />
              <FieldError message={errors.notes} />
            </div>

            {/* Documents */}
            <div className="sm:col-span-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Documents</Label>
                <span className="text-xs text-muted-foreground">
                  PDF or DOCX · max 10 MB
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DocSlot
                  title="Cover Letter"
                  file={coverFile}
                  existingName={existingCover?.filename ?? null}
                  onSelect={setCoverFile}
                  onClear={() => setCoverFile(null)}
                  disabled={submitting}
                />
                <DocSlot
                  title="Resume / CV"
                  file={resumeFile}
                  existingName={existingResume?.filename ?? null}
                  onSelect={setResumeFile}
                  onClear={() => setResumeFile(null)}
                  disabled={submitting}
                />
              </div>

              {otherDocs.length > 0 && (
                <div className="mt-3 space-y-2">
                  {otherDocs.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm"
                    >
                      <FileIcon name={d.file.name} />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm font-medium"
                          title={d.file.name}
                        >
                          {d.file.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatBytes(d.file.size)}
                        </p>
                      </div>
                      <Select
                        value={d.kind}
                        onValueChange={(v) =>
                          setOtherDocs((prev) =>
                            prev.map((x) =>
                              x.id === d.id ? { ...x, kind: v } : x
                            )
                          )
                        }
                      >
                        <SelectTrigger className="h-7 w-36 rounded-md text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Job Description">
                            Job Description
                          </SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() =>
                          setOtherDocs((prev) =>
                            prev.filter((x) => x.id !== d.id)
                          )
                        }
                        disabled={submitting}
                        aria-label={`Remove ${d.file.name}`}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => otherInputRef.current?.click()}
                disabled={submitting}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add other document
              </button>
              <input
                ref={otherInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  addOther(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />

              {uploads.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploads.map((u) => (
                    <div
                      key={u.key}
                      className="rounded-lg border bg-card px-3 py-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate font-medium">
                          {u.name}
                        </span>
                        <span
                          className={cn(
                            "tabular-nums",
                            u.status === "error"
                              ? "font-medium text-destructive"
                              : "text-muted-foreground"
                          )}
                        >
                          {u.status === "error"
                            ? "Failed"
                            : u.status === "done"
                              ? "Done"
                              : `${u.progress}%`}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-150",
                            u.status === "error"
                              ? "bg-destructive"
                              : "bg-primary"
                          )}
                          style={{ width: `${u.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 border-t bg-muted/30 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-lg" disabled={submitting}>
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {submitting
                ? "Saving…"
                : editing
                  ? "Save Changes"
                  : "Add Application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
