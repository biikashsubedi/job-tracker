"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import { FileWarning } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Serve the pdf.js worker from our own bundle (no external CDN).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

const CONTAINER_PADDING = 16;
const FALLBACK_PAGE_HEIGHT = 900;
// Mount pages within this vertical buffer of the viewport (virtualization).
const MOUNT_MARGIN = "1200px 0px";

function ErrorState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <FileWarning className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">Couldn&apos;t display this PDF</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        The file may be corrupted. Try downloading it to view in another app.
      </p>
    </div>
  );
}

function PageSkeleton() {
  return <Skeleton className="h-[70vh] w-[600px] max-w-full rounded-sm" />;
}

export default function PdfPane({
  url,
  scale,
  onFitScale,
  onNumPages,
  onCurrentPage,
}: {
  url: string;
  scale: number;
  onFitScale?: (scale: number) => void;
  onNumPages?: (n: number) => void;
  onCurrentPage?: (p: number) => void;
}) {
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(
    null
  );
  const [mounted, setMounted] = useState<Set<number>>(() => new Set());
  const wrapRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track container width for the fit-to-width calculation.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (containerWidth > 0 && pageSize) {
      onFitScale?.((containerWidth - CONTAINER_PADDING) / pageSize.w);
    }
  }, [containerWidth, pageSize, onFitScale]);

  // Virtualization: mount only pages near the viewport.
  useEffect(() => {
    if (!numPages || !wrapRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        const add: number[] = [];
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = pageRefs.current.findIndex((p) => p === e.target);
            if (idx >= 0) add.push(idx);
          }
        }
        if (add.length) {
          setMounted((prev) => {
            const next = new Set(prev);
            add.forEach((i) => next.add(i));
            return next;
          });
        }
      },
      { root: wrapRef.current, rootMargin: MOUNT_MARGIN, threshold: 0 }
    );
    pageRefs.current.forEach((p) => p && io.observe(p));
    return () => io.disconnect();
  }, [numPages]);

  // Track the most-visible page for the "n / total" indicator.
  useEffect(() => {
    if (!numPages || !wrapRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        let best: Element | null = null;
        let bestRatio = 0;
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio;
            best = e.target;
          }
        }
        if (best) {
          const idx = pageRefs.current.findIndex((p) => p === best);
          if (idx >= 0) onCurrentPage?.(idx + 1);
        }
      },
      { root: wrapRef.current, threshold: [0.1, 0.35, 0.6, 0.85] }
    );
    pageRefs.current.forEach((p) => p && io.observe(p));
    return () => io.disconnect();
  }, [numPages, onCurrentPage]);

  const handleFirstPage = useCallback(
    (page: { originalWidth: number; originalHeight: number }) => {
      setPageSize({ w: page.originalWidth, h: page.originalHeight });
    },
    []
  );

  const placeholderWidth = pageSize ? pageSize.w * scale : undefined;
  const placeholderHeight = pageSize
    ? pageSize.h * scale
    : FALLBACK_PAGE_HEIGHT;

  return (
    <div ref={wrapRef} className="min-h-full w-full">
      {error ? (
        <ErrorState />
      ) : (
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }) => {
            setNumPages(n);
            onNumPages?.(n);
          }}
          onLoadError={() => setError(true)}
          error={<ErrorState />}
          loading={
            <div className="flex justify-center py-6">
              <PageSkeleton />
            </div>
          }
          className="flex flex-col items-center gap-4 py-4"
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div
              key={i}
              ref={(el) => {
                pageRefs.current[i] = el;
              }}
              className="max-w-full overflow-hidden rounded-sm bg-white shadow-lg ring-1 ring-black/5"
              style={{
                width: placeholderWidth,
                minHeight: placeholderHeight,
              }}
            >
              {mounted.has(i) ? (
                <Page
                  pageNumber={i + 1}
                  scale={scale}
                  onLoadSuccess={i === 0 ? handleFirstPage : undefined}
                  loading={
                    <div
                      className="flex items-center justify-center"
                      style={{ height: placeholderHeight }}
                    >
                      <PageSkeleton />
                    </div>
                  }
                  renderTextLayer
                  renderAnnotationLayer={false}
                  devicePixelRatio={Math.min(
                    2,
                    typeof window !== "undefined" ? window.devicePixelRatio : 1
                  )}
                />
              ) : null}
            </div>
          ))}
        </Document>
      )}
    </div>
  );
}
