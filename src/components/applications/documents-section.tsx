"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOCUMENT_KINDS } from "@/lib/constants";
import { DOC_ACCEPT, extensionOf, validateDocFile } from "@/lib/documents";
import type { DocumentDTO } from "@/lib/types";
import { DocKindBadge } from "./badges";
import { cn } from "@/lib/utils";

const EXT_ICON_COLOR: Record<string, string> = {
  pdf: "text-red-500",
  docx: "text-blue-500",
  txt: "text-slate-500",
};

function uploadWithProgress(
  url: string,
  form: FormData,
  onProgress: (pct: number) => void
): Promise<DocumentDTO> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        let message = `Upload failed (${xhr.status})`;
        try {
          message = JSON.parse(xhr.responseText).error ?? message;
        } catch {
          // non-JSON error body
        }
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

export function DocumentsSection({
  applicationId,
  documents,
}: {
  applicationId: string;
  /** null while the parent is still loading the detail record */
  documents: DocumentDTO[] | null;
}) {
  const [docs, setDocs] = useState<DocumentDTO[] | null>(documents);
  const [kind, setKind] = useState<string>("Resume");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState<{
    name: string;
    progress: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDocs(documents);
  }, [documents, applicationId]);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || uploading) return;

    const invalid = validateDocFile(file.name, file.type, file.size);
    if (invalid) {
      toast.error(invalid);
      return;
    }

    setUploading({ name: file.name, progress: 0 });
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    try {
      const doc = await uploadWithProgress(
        `/api/applications/${applicationId}/documents`,
        form,
        (progress) => setUploading({ name: file.name, progress })
      );
      setDocs((prev) => [...(prev ?? []), doc]);
      toast.success(`Uploaded "${file.name}"`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setUploading(null);
    }
  }

  async function handleDelete(doc: DocumentDTO) {
    const snapshot = docs;
    setDocs((prev) => prev?.filter((d) => d.id !== doc.id) ?? prev);
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (!res.ok) {
      setDocs(snapshot ?? null);
      toast.error("Failed to delete document");
      return;
    }
    toast.success(`Deleted "${doc.filename}"`);
  }

  if (docs === null) {
    return (
      <div className="mt-1.5 space-y-2">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mt-1.5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Upload as</span>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="h-8 w-40 rounded-lg text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a document"
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
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition-colors",
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
        <p className="text-sm font-medium">
          Drop a file here or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, DOCX or TXT · max 10 MB
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={DOC_ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {uploading && (
        <div className="rounded-lg border bg-card px-3 py-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate font-medium">
              Uploading {uploading.name}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {uploading.progress}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-150"
              style={{ width: `${uploading.progress}%` }}
            />
          </div>
        </div>
      )}

      {docs.length === 0 && !uploading ? (
        <p className="text-sm text-muted-foreground">No documents attached.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm"
            >
              <FileText
                className={cn(
                  "h-4 w-4 shrink-0",
                  EXT_ICON_COLOR[extensionOf(doc.filename)] ??
                    "text-muted-foreground"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={doc.filename}>
                  {doc.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(doc.uploadedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <DocKindBadge kind={doc.kind} />
              <div className="flex shrink-0 items-center">
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <a
                    href={`/api/documents/${doc.id}/download`}
                    download={doc.filename}
                    aria-label={`Download ${doc.filename}`}
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                  aria-label={`Delete ${doc.filename}`}
                  onClick={() => handleDelete(doc)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
