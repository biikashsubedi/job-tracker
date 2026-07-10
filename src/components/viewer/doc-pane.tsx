"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import {
  Download,
  Maximize2,
  Plus,
  UploadCloud,
  ZoomIn,
  ZoomOut,
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
import type { DocumentDTO } from "@/lib/types";
import { extensionOf, validateSlotFile } from "@/lib/documents";
import { formatDateShort } from "@/lib/format";
import { uploadDocument } from "@/lib/upload-client";
import { DocKindBadge } from "@/components/applications/badges";
import { cn } from "@/lib/utils";

export interface DocPaneHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  scrollBy: (dy: number) => void;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const STEP = 0.15;
const clamp = (n: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, n));

function PaneLoading() {
  return (
    <div className="flex justify-center py-6">
      <Skeleton className="h-[70vh] w-[600px] max-w-full rounded-sm" />
    </div>
  );
}

// pdfjs + mammoth are only pulled in when a document actually renders.
const PdfPane = dynamic(() => import("./pdf-pane"), {
  ssr: false,
  loading: () => <PaneLoading />,
});
const DocxPane = dynamic(() => import("./docx-pane"), {
  ssr: false,
  loading: () => <PaneLoading />,
});

function versionLabel(versions: DocumentDTO[], i: number): string {
  const date = formatDateShort(versions[i].uploadedAt);
  return i === 0 ? `Current · ${date}` : `v${versions.length - i} · ${date}`;
}

interface DocPaneProps {
  doc: DocumentDTO | null;
  versions: DocumentDTO[];
  kind: "Resume" | "Cover Letter";
  applicationId: string;
  focused: boolean;
  onFocus: () => void;
  onSelectVersion: (doc: DocumentDTO) => void;
  onUploaded: (doc: DocumentDTO) => void;
}

export const DocPane = forwardRef<DocPaneHandle, DocPaneProps>(function DocPane(
  {
    doc,
    versions,
    kind,
    applicationId,
    focused,
    onFocus,
    onSelectVersion,
    onUploaded,
  },
  ref
) {
  const [scale, setScale] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [fitScale, setFitScale] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // While false, the document keeps fitting to the pane width (even as the pane
  // resizes). A manual zoom (+/-) sets it true; "fit to width" clears it.
  const manualZoom = useRef(false);

  const zoomIn = useCallback(() => {
    manualZoom.current = true;
    setScale((s) => clamp(s + STEP));
  }, []);
  const zoomOut = useCallback(() => {
    manualZoom.current = true;
    setScale((s) => clamp(s - STEP));
  }, []);
  function fitWidth() {
    if (fitScale != null) {
      manualZoom.current = false;
      setScale(clamp(fitScale));
    }
  }

  useImperativeHandle(ref, () => ({
    zoomIn,
    zoomOut,
    scrollBy: (dy: number) => bodyRef.current?.scrollBy({ top: dy }),
  }));

  // Reset paging + re-enable auto-fit when the shown version/document changes.
  useEffect(() => {
    manualZoom.current = false;
    setNumPages(0);
    setCurrentPage(1);
    setFitScale(null);
    bodyRef.current?.scrollTo({ top: 0 });
  }, [doc?.id]);

  const handleFitScale = useCallback((s: number) => {
    setFitScale(s);
    // Keep the document fit to the pane width until the user manually zooms.
    if (!manualZoom.current) setScale(clamp(s));
  }, []);

  async function handleUpload(file?: File) {
    if (!file || uploadPct !== null) return;
    const err = validateSlotFile(file.name, file.type, file.size);
    if (err) {
      toast.error(err);
      return;
    }
    setUploadPct(0);
    try {
      const uploaded = await uploadDocument(applicationId, file, kind, (p) =>
        setUploadPct(p)
      );
      onUploaded(uploaded);
      toast.success(`Uploaded "${file.name}"`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadPct(null);
    }
  }

  const ext = doc ? extensionOf(doc.filename) : "";
  const url = doc ? `/api/documents/${doc.id}/download` : "";

  return (
    <section
      onMouseDown={onFocus}
      className={cn(
        "flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-muted/30 transition-shadow",
        focused ? "ring-2 ring-primary" : "ring-1 ring-transparent"
      )}
    >
      {/* Mini toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b bg-card px-3 py-2">
        <DocKindBadge kind={kind} />

        {doc && versions.length > 1 ? (
          <Select
            value={doc.id}
            onValueChange={(id) => {
              const v = versions.find((x) => x.id === id);
              if (v) onSelectVersion(v);
            }}
          >
            <SelectTrigger
              className="h-7 w-[150px] rounded-md text-xs"
              title={doc.filename}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v, i) => (
                <SelectItem key={v.id} value={v.id} className="text-xs">
                  {versionLabel(versions, i)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span
            className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
            title={doc?.filename}
          >
            {doc ? doc.filename : "No file"}
          </span>
        )}

        {doc && versions.length > 1 && (
          <span
            className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground lg:block"
            title={doc.filename}
          >
            {doc.filename}
          </span>
        )}

        {doc && (
          <div className="flex shrink-0 items-center gap-1">
            {numPages > 0 && (
              <span className="mr-1 text-xs tabular-nums text-muted-foreground">
                {currentPage} / {numPages}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Zoom out"
              onClick={zoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Zoom in"
              onClick={zoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Fit to width"
              disabled={fitScale === null}
              onClick={fitWidth}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`Download ${doc.filename}`}
            >
              <a href={url} download={doc.filename}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* Independent scroll body */}
      <div
        ref={bodyRef}
        tabIndex={0}
        onFocus={onFocus}
        className="min-h-0 flex-1 overflow-auto outline-none"
      >
        {doc ? (
          ext === "pdf" ? (
            <PdfPane
              key={url}
              url={url}
              scale={scale}
              onFitScale={handleFitScale}
              onNumPages={setNumPages}
              onCurrentPage={setCurrentPage}
            />
          ) : ext === "docx" ? (
            <DocxPane
              key={url}
              docId={doc.id}
              url={url}
              scale={scale}
              onFitScale={handleFitScale}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Preview isn&apos;t available for this file type — use download.
            </div>
          )
        ) : (
          // Empty state with inline upload
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <div
              role="button"
              tabIndex={0}
              aria-label={`Upload ${kind}`}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  inputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleUpload(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex w-full max-w-sm cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <UploadCloud
                className={cn(
                  "h-7 w-7",
                  dragOver ? "text-primary" : "text-muted-foreground"
                )}
              />
              <p className="text-sm font-medium">
                No {kind.toLowerCase()} uploaded
              </p>
              <p className="text-xs text-muted-foreground">
                Drop a file or click to upload · PDF or DOCX
              </p>
              {uploadPct !== null && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-150"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={() => inputRef.current?.click()}
              disabled={uploadPct !== null}
            >
              <Plus className="h-4 w-4" />
              Upload {kind}
            </Button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => {
            handleUpload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </section>
  );
});
