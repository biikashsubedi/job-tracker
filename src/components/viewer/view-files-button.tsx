"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApplicationRow, DocumentSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

/** True if the application has an active Resume or Cover Letter to view. */
export function canViewFiles(app: {
  documents?: Pick<DocumentSummary, "kind" | "isActive">[];
}): boolean {
  return !!app.documents?.some(
    (d) =>
      (d.kind === "Resume" || d.kind === "Cover Letter") && d.isActive !== false
  );
}

export function filesHref(id: string) {
  return `/applications/${id}/files`;
}

export function ViewFilesButton({
  app,
  variant = "icon",
  className,
}: {
  app: ApplicationRow;
  variant?: "icon" | "full";
  className?: string;
}) {
  const router = useRouter();
  const enabled = canViewFiles(app);
  const tip = enabled ? "View files" : "No documents uploaded";

  const go = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (enabled) router.push(filesHref(app.id));
  };

  if (variant === "full") {
    // span wrapper so the tooltip shows even while the button is disabled
    return (
      <span title={tip} className={cn("inline-flex", className)}>
        <Button
          variant="outline"
          className="w-full gap-1.5 rounded-lg"
          disabled={!enabled}
          onClick={go}
        >
          <Eye className="h-4 w-4" />
          View Files
        </Button>
      </span>
    );
  }

  return (
    <span title={tip} className="inline-flex">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 text-muted-foreground hover:text-foreground",
          className
        )}
        aria-label={enabled ? `View files for ${app.position}` : tip}
        disabled={!enabled}
        onClick={go}
      >
        <Eye className="h-4 w-4" />
      </Button>
    </span>
  );
}
