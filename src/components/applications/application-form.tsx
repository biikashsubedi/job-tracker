"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STATUSES,
  ROLE_TYPES,
  WORK_MODES,
  PLATFORMS,
  INTERVIEW_ROUNDS,
} from "@/lib/constants";
import { applicationCreateSchema } from "@/lib/validation";
import type { ApplicationPayload, ApplicationRow } from "@/lib/types";
import { toDateInputValue } from "@/lib/format";
import { statusColor } from "./badges";
import { cn } from "@/lib/utils";

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

export type SubmitResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string> };

interface ApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ApplicationRow | null;
  onSubmit: (payload: ApplicationPayload) => Promise<SubmitResult>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

export function ApplicationForm({
  open,
  onOpenChange,
  editing,
  onSubmit,
}: ApplicationFormProps) {
  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(editing ? valuesFromApp(editing) : DEFAULT_VALUES);
      setErrors({});
      setSubmitting(false);
    }
  }, [open, editing]);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = buildPayload(values);

    const parsed = applicationCreateSchema.safeParse(payload);
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
    setSubmitting(false);
    if (!result.ok) {
      if (result.fieldErrors) setErrors(result.fieldErrors);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            statusColor(s).dot
                          )}
                        />
                        {s}
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
                  {ROLE_TYPES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
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
                  {WORK_MODES.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
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
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
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
                  {INTERVIEW_ROUNDS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
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
              {editing ? "Save Changes" : "Add Application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
