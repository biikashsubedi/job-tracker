"use client";

import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/auth-actions";
import { passwordStrength, PASSWORD_POLICY } from "@/lib/validation-auth";
import { cn } from "@/lib/utils";

const STRENGTH = [
  { label: "Too weak", color: "bg-red-500" },
  { label: "Weak", color: "bg-red-500" },
  { label: "Fair", color: "bg-amber-500" },
  { label: "Good", color: "bg-blue-500" },
  { label: "Strong", color: "bg-green-500" },
];

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1.5">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
          className="rounded-lg pr-10"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const strength = passwordStrength(next);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!current) errs.current = "Enter your current password";
    if (next.length < 10) errs.next = "At least 10 characters";
    else if (!/[A-Za-z]/.test(next) || !/[0-9]/.test(next))
      errs.next = "Must include a letter and a number";
    if (confirm !== next) errs.confirm = "Passwords don't match";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFormError(null);
    setPending(true);
    try {
      const res = await changePassword(current, next);
      if (res.ok) {
        toast.success("Password changed — please sign in again");
        window.location.assign("/login");
        return;
      }
      setFormError(res.error);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border bg-card p-6 shadow-sm"
      noValidate
    >
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <PasswordInput
        id="current"
        label="Current password"
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
        disabled={pending}
        invalid={!!errors.current}
      />
      {errors.current && (
        <p className="text-xs text-destructive">{errors.current}</p>
      )}

      <div>
        <PasswordInput
          id="new"
          label="New password"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          disabled={pending}
          invalid={!!errors.next}
        />
        {/* Strength meter */}
        <div className="mt-2 flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                next && i < strength
                  ? STRENGTH[strength].color
                  : "bg-muted"
              )}
            />
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {next ? STRENGTH[strength].label : PASSWORD_POLICY}
        </p>
        {errors.next && (
          <p className="mt-1 text-xs text-destructive">{errors.next}</p>
        )}
      </div>

      <div>
        <PasswordInput
          id="confirm"
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          disabled={pending}
          invalid={!!errors.confirm}
        />
        {errors.confirm && (
          <p className="mt-1 text-xs text-destructive">{errors.confirm}</p>
        )}
      </div>

      <Button type="submit" className="w-full rounded-lg" disabled={pending}>
        {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
        {pending ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
