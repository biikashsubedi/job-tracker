"use client";

import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { FileWarning, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_WIDTH = 816; // US Letter @ 96dpi
const CONTAINER_PADDING = 16;

// Session cache of sanitized HTML, keyed by document id — reopening is instant.
const htmlCache = new Map<string, string>();

const DOCX_STYLES = `
.docx-content { color: #1a1a1a; font-size: 15px; line-height: 1.6; font-family: ui-serif, Georgia, "Times New Roman", serif; }
.docx-content h1 { font-size: 1.6em; font-weight: 700; margin: 0.6em 0 0.4em; }
.docx-content h2 { font-size: 1.3em; font-weight: 700; margin: 0.6em 0 0.3em; }
.docx-content h3 { font-size: 1.1em; font-weight: 700; margin: 0.5em 0 0.3em; }
.docx-content p { margin: 0 0 0.7em; }
.docx-content ul, .docx-content ol { margin: 0 0 0.7em; padding-left: 1.5em; }
.docx-content li { margin-bottom: 0.25em; }
.docx-content a { color: #4f46e5; text-decoration: underline; }
.docx-content table { border-collapse: collapse; width: 100%; margin: 0.7em 0; }
.docx-content td, .docx-content th { border: 1px solid #d4d4d8; padding: 6px 8px; }
.docx-content img { max-width: 100%; height: auto; }
.docx-content strong { font-weight: 700; }
`;

function StateBox({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      {icon}
      <p className="text-sm font-medium">{title}</p>
      {subtitle && (
        <p className="max-w-xs text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

export default function DocxPane({
  docId,
  url,
  scale,
  onFitScale,
}: {
  docId: string;
  url: string;
  scale: number;
  onFitScale?: (scale: number) => void;
}) {
  const [html, setHtml] = useState<string | null>(
    () => htmlCache.get(docId) ?? null
  );
  const [error, setError] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (containerWidth > 0) {
      onFitScale?.((containerWidth - CONTAINER_PADDING) / PAGE_WIDTH);
    }
  }, [containerWidth, onFitScale]);

  useEffect(() => {
    // Cached from a previous open this session — nothing to do.
    if (htmlCache.has(docId)) {
      setHtml(htmlCache.get(docId)!);
      setError(false);
      return;
    }
    let cancelled = false;
    setHtml(null);
    setError(false);
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const buf = await res.arrayBuffer();
        // Lazy-load mammoth only when a DOCX is actually opened.
        const mammoth = await import("mammoth");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (mammoth as any).convertToHtml({ arrayBuffer: buf });
        // DOCX content becomes HTML — sanitize before rendering.
        const clean = DOMPurify.sanitize(result.value as string);
        htmlCache.set(docId, clean);
        if (!cancelled) setHtml(clean);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docId, url]);

  return (
    <div ref={wrapRef} className="min-h-full w-full">
      <style>{DOCX_STYLES}</style>
      <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-amber-200/60 bg-amber-50/90 px-3 py-1.5 text-[11px] text-amber-800 backdrop-blur dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
        <Info className="h-3 w-3 shrink-0" />
        Preview of DOCX — formatting may differ slightly; download for the exact
        file.
      </div>

      {error ? (
        <StateBox
          icon={<FileWarning className="h-8 w-8 text-muted-foreground" />}
          title="Couldn't display this document"
          subtitle="The file may be corrupted. Try downloading it to view in another app."
        />
      ) : html === null ? (
        <div className="flex justify-center py-6">
          <div
            className="space-y-3 bg-white p-16 shadow-lg"
            style={{ width: PAGE_WIDTH, maxWidth: "100%" }}
          >
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-6">
          <div
            className="bg-white px-16 py-14 shadow-lg ring-1 ring-black/5"
            style={{ width: PAGE_WIDTH, maxWidth: "100%", zoom: scale }}
          >
            <div
              className="docx-content"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
