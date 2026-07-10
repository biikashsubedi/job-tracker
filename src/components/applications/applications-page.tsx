"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type {
  ApplicationDetail,
  ApplicationPayload,
  ApplicationRow,
} from "@/lib/types";
import { ChevronLeft, ChevronRight, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRevalidateOnFocus } from "@/lib/use-revalidate";
import { Toolbar, EMPTY_FILTERS, type Filters } from "./toolbar";
import { ApplicationsTable, TableSkeleton } from "./applications-table";
import { DetailDrawer } from "./detail-drawer";
import { ApplicationForm, type SubmitResult } from "./application-form";
import { DeleteDialog } from "./delete-dialog";
import { EmptyState } from "./empty-state";
import { ImportDialog } from "./import-dialog";

async function readError(
  res: Response
): Promise<{ message: string; fieldErrors: Record<string, string> }> {
  const fallback = { message: `Request failed (${res.status})`, fieldErrors: {} };
  try {
    const data = await res.json();
    const fieldErrors: Record<string, string> = {};
    if (Array.isArray(data.details)) {
      for (const d of data.details) {
        if (d.path && !fieldErrors[d.path]) fieldErrors[d.path] = d.message;
      }
    }
    return { message: data.error ?? fallback.message, fieldErrors };
  } catch {
    return fallback;
  }
}

// Page-size choices. "all" removes the limit (handy for small pipelines / export
// prep); the default keeps the table snappy as the pipeline grows.
const PAGE_SIZES = [25, 50, 100, "all"] as const;
type PageSize = (typeof PAGE_SIZES)[number];
const DEFAULT_PAGE_SIZE: PageSize = 50;

function PaginationBar({
  page,
  pageSize,
  total,
  shown,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: PageSize;
  total: number;
  shown: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}) {
  const allMode = pageSize === "all";
  const from = total === 0 ? 0 : allMode ? 1 : page * pageSize + 1;
  const to = allMode ? total : page * pageSize + shown;
  const pageCount = allMode ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const canPrev = !allMode && page > 0;
  const canNext = !allMode && page < pageCount - 1;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="tabular-nums">
          {from}–{to} of {total}
        </span>
        <span className="hidden text-border sm:inline">·</span>
        <div className="hidden items-center gap-1.5 sm:flex">
          <span>Show</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) =>
              onPageSizeChange(v === "all" ? "all" : (Number(v) as PageSize))
            }
          >
            <SelectTrigger className="h-8 w-[76px] rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={String(size)} value={String(size)}>
                  {size === "all" ? "All" : size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>per page</span>
        </div>
      </div>

      {!allMode && pageCount > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 rounded-lg"
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            Page {page + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 rounded-lg"
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function ApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [apps, setApps] = useState<ApplicationRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(0); // zero-based

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApplicationRow | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ApplicationRow | null>(null);
  const [selectedDetail, setSelectedDetail] =
    useState<ApplicationDetail | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ApplicationRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Filter/sort/page-size changes reset back to the first page.
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, filters, sortBy, sortDir, pageSize]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    if (pageSize !== "all") {
      params.set("limit", String(pageSize));
      params.set("offset", String(page * pageSize));
    }
    return params.toString();
  }, [debouncedSearch, filters, sortBy, sortDir, pageSize, page]);

  const fetchSeq = useRef(0);
  const fetchList = useCallback(async () => {
    const seq = ++fetchSeq.current;
    try {
      const res = await fetch(`/api/applications?${query}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApplicationRow[] = await res.json();
      const count = Number(res.headers.get("X-Total-Count") ?? data.length);
      if (seq === fetchSeq.current) {
        setApps(data);
        setTotal(count);
      }
    } catch {
      if (seq === fetchSeq.current) {
        setApps((prev) => prev ?? []);
        toast.error("Failed to load applications");
      }
    }
  }, [query]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Re-fetch the detail of the currently open drawer (after a doc change / return).
  const refreshOpenDetail = useCallback(() => {
    const id = selected?.id;
    if (!id || !drawerOpen) return;
    fetch(`/api/applications/${id}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: ApplicationDetail) => {
        setSelected(data);
        setSelectedDetail(data);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, drawerOpen]);

  // Returning to the list (back-nav, tab refocus, cross-tab edits) → refresh.
  useRevalidateOnFocus(() => {
    fetchList();
    refreshOpenDetail();
  });

  // Navbar "+ Add Application" navigates to /?new=1
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  const hasActiveFilters =
    debouncedSearch.trim() !== "" ||
    Object.values(filters).some((v) => v !== "");

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(app: ApplicationRow) {
    setEditing(app);
    setFormOpen(true);
  }

  function openDetail(app: ApplicationRow) {
    setSelected(app);
    setSelectedDetail(null);
    setDrawerOpen(true);
    fetch(`/api/applications/${app.id}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: ApplicationDetail) => {
        setSelected(data);
        setSelectedDetail(data);
      })
      .catch(() => toast.error("Failed to load application details"));
  }

  const handleSubmit = useCallback(
    async (payload: ApplicationPayload): Promise<SubmitResult> => {
      if (editing) {
        // Optimistic update
        const snapshot = apps;
        setApps(
          (prev) =>
            prev?.map((a) =>
              a.id === editing.id ? { ...a, ...payload } : a
            ) ?? prev
        );
        const res = await fetch(`/api/applications/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          setApps(snapshot ?? null);
          const { message, fieldErrors } = await readError(res);
          toast.error(message);
          return { ok: false, fieldErrors };
        }
        const updated: ApplicationDetail = await res.json();
        setApps(
          (prev) =>
            prev?.map((a) => (a.id === updated.id ? updated : a)) ?? prev
        );
        if (selected?.id === updated.id) {
          setSelected(updated);
          setSelectedDetail(updated);
        }
        toast.success("Application updated");
        fetchList();
        router.refresh(); // keep board & dashboard fresh on next navigation
        return { ok: true, app: updated };
      }

      // Create — optimistic temp row
      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const tempRow: ApplicationRow = {
        id: tempId,
        ...payload,
        createdAt: now,
        updatedAt: now,
      };
      setApps((prev) => [tempRow, ...(prev ?? [])]);
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setApps((prev) => prev?.filter((a) => a.id !== tempId) ?? prev);
        const { message, fieldErrors } = await readError(res);
        toast.error(message);
        return { ok: false, fieldErrors };
      }
      const created: ApplicationRow = await res.json();
      setApps(
        (prev) => prev?.map((a) => (a.id === tempId ? created : a)) ?? prev
      );
      toast.success("Application added");
      fetchList();
      router.refresh(); // keep board & dashboard fresh on next navigation
      return { ok: true, app: created };
    },
    [apps, editing, fetchList, selected, router]
  );

  const handleDelete = useCallback(
    async (app: ApplicationRow) => {
      setDeleteTarget(null);
      if (selected?.id === app.id) {
        setDrawerOpen(false);
        setSelected(null);
        setSelectedDetail(null);
      }
      // Optimistic removal
      const snapshot = apps;
      setApps((prev) => prev?.filter((a) => a.id !== app.id) ?? prev);
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setApps(snapshot ?? null);
        const { message } = await readError(res);
        toast.error(message);
        return;
      }
      toast.success(`Deleted "${app.position}" at ${app.company}`);
      router.refresh(); // keep board & dashboard fresh on next navigation
    },
    [apps, selected, router]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {apps === null
              ? "Loading your pipeline…"
              : `${total} application${total === 1 ? "" : "s"} in your pipeline`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg"
          >
            <a href="/api/applications/export" download>
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          </Button>
        </div>
      </div>

      <div className="sticky top-14 z-30 -mx-4 border-b border-border/50 bg-background/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
        />
      </div>

      <section aria-label="Applications list" className="mt-5">
        {apps === null ? (
          <TableSkeleton />
        ) : apps.length === 0 ? (
          <EmptyState
            filtered={hasActiveFilters}
            onAdd={openCreate}
            onClearFilters={() => {
              setSearch("");
              setFilters(EMPTY_FILTERS);
            }}
          />
        ) : (
          <ApplicationsTable
            apps={apps}
            onRowClick={openDetail}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        )}
      </section>

      {apps !== null && apps.length > 0 && (
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={total}
          shown={apps.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <ApplicationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSubmit={handleSubmit}
        onDocumentsUploaded={fetchList}
      />

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setSelected(null);
            setSelectedDetail(null);
          }
        }}
        app={selected}
        detail={selectedDetail}
        onEdit={(app) => {
          setDrawerOpen(false);
          openEdit(app);
        }}
        onDelete={(app) => setDeleteTarget(app)}
        onDocumentsChanged={() => {
          fetchList();
          refreshOpenDetail();
          router.refresh(); // keep board & dashboard fresh on next navigation
        }}
      />

      <DeleteDialog
        app={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={fetchList}
      />
    </div>
  );
}
