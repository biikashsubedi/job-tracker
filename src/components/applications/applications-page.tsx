"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type {
  ApplicationDetail,
  ApplicationPayload,
  ApplicationRow,
} from "@/lib/types";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function ApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [apps, setApps] = useState<ApplicationRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    return params.toString();
  }, [debouncedSearch, filters, sortBy, sortDir]);

  const fetchSeq = useRef(0);
  const fetchList = useCallback(async () => {
    const seq = ++fetchSeq.current;
    try {
      const res = await fetch(`/api/applications?${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApplicationRow[] = await res.json();
      if (seq === fetchSeq.current) setApps(data);
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
    fetch(`/api/applications/${app.id}`)
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
        return { ok: true };
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
      return { ok: true };
    },
    [apps, editing, fetchList, selected]
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
    },
    [apps, selected]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {apps === null
              ? "Loading your pipeline…"
              : `${apps.length} application${apps.length === 1 ? "" : "s"} in your pipeline`}
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

      <ApplicationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSubmit={handleSubmit}
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
