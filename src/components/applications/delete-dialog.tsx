"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ApplicationRow } from "@/lib/types";

interface DeleteDialogProps {
  app: ApplicationRow | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (app: ApplicationRow) => void;
}

export function DeleteDialog({ app, onOpenChange, onConfirm }: DeleteDialogProps) {
  return (
    <AlertDialog open={app !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this application?</AlertDialogTitle>
          <AlertDialogDescription>
            {app
              ? `"${app.position}" at ${app.company} will be permanently deleted, along with its documents and status history. This cannot be undone.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => app && onConfirm(app)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
