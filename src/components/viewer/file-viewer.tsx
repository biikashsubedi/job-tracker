"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Download, PanelRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/applications/badges";
import type { ApplicationRow, DocumentDTO } from "@/lib/types";
import { DocPane, type DocPaneHandle } from "./doc-pane";
import { ViewerSidePanel } from "./viewer-side-panel";
import { cn } from "@/lib/utils";

type Side = "left" | "right";
type Kind = "Cover Letter" | "Resume";

export function FileViewer({
  app,
  coverVersions: initialCover,
  resumeVersions: initialResume,
}: {
  app: ApplicationRow;
  coverVersions: DocumentDTO[];
  resumeVersions: DocumentDTO[];
}) {
  const router = useRouter();
  const [coverVersions, setCoverVersions] = useState(initialCover);
  const [resumeVersions, setResumeVersions] = useState(initialResume);
  const [coverIdx, setCoverIdx] = useState(0);
  const [resumeIdx, setResumeIdx] = useState(0);

  const [split, setSplit] = useState(50);
  const [swapped, setSwapped] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [focusedSide, setFocusedSide] = useState<Side>(
    initialCover.length ? "left" : initialResume.length ? "right" : "left"
  );
  const [activeTab, setActiveTab] = useState<Kind>("Cover Letter");

  const containerRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<DocPaneHandle>(null);
  const rightRef = useRef<DocPaneHandle>(null);

  const coverDoc = coverVersions[coverIdx] ?? null;
  const resumeDoc = resumeVersions[resumeIdx] ?? null;
  const hasAny = !!coverDoc || !!resumeDoc;

  const close = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }, [router]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setIsDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      const handle = focusedSide === "left" ? leftRef.current : rightRef.current;
      if (!handle) return;
      switch (e.key) {
        case "+":
        case "=":
          e.preventDefault();
          handle.zoomIn();
          break;
        case "-":
        case "_":
          e.preventDefault();
          handle.zoomOut();
          break;
        case "ArrowDown":
          e.preventDefault();
          handle.scrollBy(90);
          break;
        case "ArrowUp":
          e.preventDefault();
          handle.scrollBy(-90);
          break;
        case "PageDown":
          e.preventDefault();
          handle.scrollBy(window.innerHeight * 0.8);
          break;
        case "PageUp":
          e.preventDefault();
          handle.scrollBy(-window.innerHeight * 0.8);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedSide, close]);

  function startDrag(e: React.PointerEvent) {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: PointerEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(78, Math.max(22, pct)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
    };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function selectVersion(kind: Kind, doc: DocumentDTO) {
    const list = kind === "Cover Letter" ? coverVersions : resumeVersions;
    const idx = list.findIndex((v) => v.id === doc.id);
    if (idx < 0) return;
    if (kind === "Cover Letter") setCoverIdx(idx);
    else setResumeIdx(idx);
  }

  function handleUploaded(doc: DocumentDTO) {
    const prepend = (list: DocumentDTO[]) => [
      doc,
      ...list.map((v) => ({ ...v, isActive: false })),
    ];
    if (doc.kind === "Resume") {
      setResumeVersions(prepend);
      setResumeIdx(0);
    } else if (doc.kind === "Cover Letter") {
      setCoverVersions(prepend);
      setCoverIdx(0);
    }
    // Invalidate the client Router Cache so the applications list / board /
    // dashboard remount with fresh data when the user navigates back.
    router.refresh();
  }

  function scrollToTab(tab: Kind) {
    const el = tabScrollRef.current;
    if (!el) return;
    el.scrollTo({
      left: tab === "Resume" ? el.clientWidth : 0,
      behavior: "smooth",
    });
  }

  function onTabScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const tab: Kind = el.scrollLeft >= el.clientWidth / 2 ? "Resume" : "Cover Letter";
    if (tab !== activeTab) {
      setActiveTab(tab);
      setFocusedSide(tab === "Cover Letter" ? "left" : "right");
    }
  }

  const renderPane = (kind: Kind, refObj: React.Ref<DocPaneHandle>, side: Side) => {
    const versions = kind === "Cover Letter" ? coverVersions : resumeVersions;
    const doc = kind === "Cover Letter" ? coverDoc : resumeDoc;
    return (
      <DocPane
        ref={refObj}
        doc={doc}
        versions={versions}
        kind={kind}
        applicationId={app.id}
        focused={focusedSide === side}
        onFocus={() => setFocusedSide(side)}
        onSelectVersion={(d) => selectVersion(kind, d)}
        onUploaded={handleUploaded}
      />
    );
  };

  // Desktop: left is Cover Letter by default; "swap sides" flips them.
  const leftKind: Kind = swapped ? "Resume" : "Cover Letter";
  const rightKind: Kind = swapped ? "Cover Letter" : "Resume";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b bg-card px-4 py-2.5 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold sm:text-base">
              {app.position}
            </h1>
            <StatusPill status={app.status} className="hidden sm:inline-flex" />
          </div>
          <p className="truncate text-xs text-muted-foreground">{app.company}</p>
        </div>

        {isDesktop && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={() => setSwapped((v) => !v)}
          >
            <ArrowLeftRight className="h-4 w-4" />
            Swap sides
          </Button>
        )}
        <Button
          variant={sidePanelOpen ? "secondary" : "outline"}
          size="sm"
          className="gap-1.5 rounded-lg"
          onClick={() => setSidePanelOpen((v) => !v)}
        >
          <PanelRight className="h-4 w-4" />
          <span className="hidden sm:inline">Details</span>
        </Button>
        {hasAny && (
          <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-lg">
            <a
              href={`/api/applications/${app.id}/files/download-all`}
              download
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download all</span>
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg"
          aria-label="Close viewer"
          onClick={close}
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      {/* Content + optional desktop side panel */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {isDesktop ? (
            // Desktop split view
            <div ref={containerRef} className="flex min-h-0 flex-1 gap-0 p-3">
              <div
                className="flex min-h-0 min-w-0"
                style={{ flexBasis: `${split}%`, flexGrow: 0, flexShrink: 0 }}
              >
                {renderPane(leftKind, leftRef, "left")}
              </div>
              <div
                onPointerDown={startDrag}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize panes"
                className="group flex w-1.5 shrink-0 cursor-col-resize items-center justify-center"
              >
                <div className="h-10 w-1 rounded-full bg-border transition-colors group-hover:bg-primary" />
              </div>
              <div className="flex min-h-0 min-w-0 flex-1">
                {renderPane(rightKind, rightRef, "right")}
              </div>
            </div>
          ) : (
            // Mobile: swipeable tabs
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 border-b bg-card">
                {(["Cover Letter", "Resume"] as Kind[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => scrollToTab(k)}
                    className={cn(
                      "flex-1 py-2.5 text-sm font-medium transition-colors",
                      activeTab === k
                        ? "border-b-2 border-primary text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div
                ref={tabScrollRef}
                onScroll={onTabScroll}
                className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
              >
                <div className="min-h-0 w-full shrink-0 snap-center p-3">
                  {renderPane("Cover Letter", leftRef, "left")}
                </div>
                <div className="min-h-0 w-full shrink-0 snap-center p-3">
                  {renderPane("Resume", rightRef, "right")}
                </div>
              </div>
            </div>
          )}
        </div>

        {isDesktop && sidePanelOpen && (
          <ViewerSidePanel
            app={app}
            className="w-[300px] shrink-0 border-l"
          />
        )}
      </div>

      {/* Mobile side panel overlay */}
      {!isDesktop && sidePanelOpen && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/40"
            onClick={() => setSidePanelOpen(false)}
          />
          <ViewerSidePanel
            app={app}
            onClose={() => setSidePanelOpen(false)}
            className="fixed right-0 top-0 z-[56] h-full w-80 max-w-[85vw] border-l shadow-xl"
          />
        </>
      )}
    </div>
  );
}
