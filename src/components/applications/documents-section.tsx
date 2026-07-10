"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileText,
  History,
  Trash2,
  UploadCloud,
} from "lucide-react";
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
import { DOC_ACCEPT, extensionOf, validateUpload } from "@/lib/documents";
import { uploadDocument } from "@/lib/upload-client";
import type { DocumentDTO } from "@/lib/types";
import { DocKindBadge } from "./badges";
import { cn } from "@/lib/utils";

const EXT_ICON_COLOR: Record<string, string> = {
  pdf: "text-red-500",
  docx: "text-blue-500",
  txt: "text-slate-500",
};

const REPLACEABLE = new Set(["Resume", "Cover Letter"]);

function DocRow({
  doc,
  muted = false,
  onDelete,
}: {
  doc: DocumentDTO;
  muted?: boolean;
  onDelete: (doc: DocumentDTO) => void;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm",
        muted && "opacity-70"
      )}
    >
      <FileText
        className={cn(
          "h-4 w-4 shrink-0",
          EXT_ICON_COLOR[extensionOf(doc.filename)] ?? "text-muted-foreground"
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
          onClick={() => onDelete(doc)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

export function DocumentsSection({
  applicationId,
  documents,
  onChanged,
}: {
  applicationId: string;
  /** null while the parent is still loading the detail record */
  documents: DocumentDTO[] | null;
  /** fired after a successful upload/delete so parents can refresh list data */
  onChanged?: () => void;
}) {
  const [docs, setDocs] = useState<DocumentDTO[] | null>(documents);
  const [kind, setKind] = useState<string>("Resume");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState<{
    name: string;
    progress: number;
  } | null>(null);
  const [showPrevious, setShowPrevious] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDocs(documents);
  }, [documents, applicationId]);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || uploading) return;

    const invalid = validateUpload(file.name, file.type, file.size, kind);
    if (invalid) {
      toast.error(invalid);
      return;
    }

    setUploading({ name: file.name, progress: 0 });
    try {
      const doc = await uploadDocument(applicationId, file, kind, (progress) =>
        setUploading({ name: file.name, progress })
      );
      // mirror server-side supersede: retire the previous active doc of this kind
      setDocs((prev) => {
        const list = prev ?? [];
        const next = REPLACEABLE.has(doc.kind)
          ? list.map((d) =>
              d.kind === doc.kind && d.isActive !== false
                ? { ...d, isActive: false }
                : d
            )
          : list;
        return [doc, ...next];
      });
      toast.success(`Uploaded "${file.name}"`);
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
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
    onChanged?.();
  }

  if (docs === null) {
    return (
      <div className="mt-1.5 space-y-2">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  const active = docs.filter((d) => d.isActive !== false);
  const superseded = docs.filter((d) => d.isActive === false);

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
          {kind === "Job Description"
            ? "Any file type · max 10 MB"
            : "PDF, DOCX or TXT · max 10 MB"}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={kind === "Job Description" ? undefined : DOC_ACCEPT}
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

      {active.length === 0 && !uploading ? (
        <p className="text-sm text-muted-foreground">No documents attached.</p>
      ) : (
        <ul className="space-y-2">
          {active.map((doc) => (
            <DocRow key={doc.id} doc={doc} onDelete={handleDelete} />
          ))}
        </ul>
      )}

      {superseded.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowPrevious((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <History className="h-3.5 w-3.5" />
            Previous versions ({superseded.length})
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                showPrevious && "rotate-180"
              )}
            />
          </button>
          {showPrevious && (
            <ul className="space-y-2 border-l-2 border-dashed border-border pl-3">
              {superseded.map((doc) => (
                <DocRow key={doc.id} doc={doc} muted onDelete={handleDelete} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
