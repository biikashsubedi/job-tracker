"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  colorClasses,
  LOOKUP_TYPE_META,
  type LookupType,
} from "@/lib/lookup-colors";
import { GROUP_ORDER, GROUP_META } from "@/lib/status-groups";
import { cn } from "@/lib/utils";
import { OptionDialog, type OptionDraft } from "./option-dialog";
import { DeleteOptionDialog } from "./delete-option-dialog";
import { readApiError, type AdminLookupRow } from "./types";

// ---- row -------------------------------------------------------------------

function ActiveToggle({
  row,
  disabled,
  disabledReason,
  onToggle,
}: {
  row: AdminLookupRow;
  disabled: boolean;
  disabledReason?: string;
  onToggle: (row: AdminLookupRow) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "hidden w-14 text-right text-xs font-medium tabular-nums sm:inline",
          row.isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {row.isActive ? "Active" : "Inactive"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={row.isActive}
        aria-label={`${row.label} ${row.isActive ? "active" : "inactive"}`}
        title={
          disabled
            ? disabledReason
            : row.isActive
              ? "Active — click to deactivate"
              : "Inactive — click to activate"
        }
        disabled={disabled}
        onClick={() => onToggle(row)}
        className={cn(
          "inline-flex h-5 w-9 shrink-0 items-center rounded-full outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          row.isActive ? "bg-primary" : "bg-muted-foreground/30",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
            row.isActive ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

function RowContent({
  row,
  singular,
  lastOption,
  lastActive,
  onEdit,
  onDelete,
  onToggle,
  handleProps,
  dragging,
}: {
  row: AdminLookupRow;
  singular: string;
  lastOption: boolean;
  lastActive: boolean;
  onEdit: (row: AdminLookupRow) => void;
  onDelete: (row: AdminLookupRow) => void;
  onToggle: (row: AdminLookupRow) => void;
  handleProps?: Record<string, unknown>;
  dragging?: boolean;
}) {
  const c = colorClasses(row.color);
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-2.5 py-2.5 sm:flex-nowrap sm:rounded-none sm:border-x-0 sm:border-b sm:border-t-0 sm:bg-transparent sm:px-3",
        dragging && "opacity-40",
        !row.isActive && "bg-muted/30 sm:bg-muted/20"
      )}
    >
      <button
        type="button"
        aria-label={`Reorder ${row.label}`}
        className="-ml-1 cursor-grab touch-none rounded p-1 text-muted-foreground/60 hover:bg-accent hover:text-foreground active:cursor-grabbing"
        {...handleProps}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span
        className={cn(
          "flex min-w-0 items-center gap-2 text-sm font-medium",
          !row.isActive && "text-muted-foreground"
        )}
      >
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", c.dot)} />
        <span className="truncate">{row.label}</span>
        {!row.isActive && (
          <span className="rounded border border-dashed px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            inactive
          </span>
        )}
      </span>

      <span className="hidden w-16 shrink-0 text-xs capitalize text-muted-foreground md:inline">
        {row.color}
      </span>

      <span className="ml-auto shrink-0 text-xs text-muted-foreground sm:ml-0 sm:w-44">
        {row.usageCount === 0
          ? "not used"
          : `used by ${row.usageCount} application${row.usageCount === 1 ? "" : "s"}`}
      </span>

      <div className="flex w-full items-center justify-end gap-1 sm:ml-auto sm:w-auto sm:gap-2">
        <ActiveToggle
          row={row}
          disabled={row.isActive && lastActive}
          disabledReason={`Every ${singular} type needs at least one active option`}
          onToggle={onToggle}
        />
        <div className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-lg p-0"
          aria-label={`Edit ${row.label}`}
          onClick={() => onEdit(row)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <span
          title={
            lastOption
              ? `The last ${singular} option cannot be deleted — every type needs at least one`
              : undefined
          }
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-lg p-0 text-red-600 hover:text-red-600 dark:text-red-400"
            aria-label={`Delete ${row.label}`}
            disabled={lastOption}
            onClick={() => onDelete(row)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </span>
      </div>
    </div>
  );
}

function SortableRow(props: {
  row: AdminLookupRow;
  singular: string;
  lastOption: boolean;
  lastActive: boolean;
  onEdit: (row: AdminLookupRow) => void;
  onDelete: (row: AdminLookupRow) => void;
  onToggle: (row: AdminLookupRow) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.row.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <RowContent
        {...props}
        dragging={isDragging}
        handleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function GroupSection({
  group,
  children,
  count,
}: {
  group: string;
  children: React.ReactNode;
  count: number;
}) {
  const meta = GROUP_META[group];
  const { setNodeRef, isOver } = useDroppable({ id: `group:${group}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow",
        isOver && `ring-2 ${meta?.dropRing ?? "ring-ring"}`
      )}
    >
      <div className={cn("h-1", meta?.accentBar ?? "bg-gray-400")} />
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
        <h3 className="text-sm font-semibold">{group}</h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            meta?.countBadge ?? "bg-gray-100 text-gray-700"
          )}
        >
          {count}
        </span>
      </div>
      <div className="space-y-2 p-2 sm:space-y-0 sm:p-0">
        {children}
        {count === 0 && (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            Drag a status here
          </p>
        )}
      </div>
    </div>
  );
}

// ---- manager ----------------------------------------------------------------

export function LookupManager({
  type,
  initialRows,
}: {
  type: LookupType;
  initialRows: AdminLookupRow[];
}) {
  const router = useRouter();
  const meta = LOOKUP_TYPE_META[type];
  const grouped = type === "STATUS";

  const [rows, setRows] = useState<AdminLookupRow[]>(initialRows);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLookupRow | null>(null);
  const [deleting, setDeleting] = useState<AdminLookupRow | null>(null);
  const [renameConfirm, setRenameConfirm] = useState<{
    row: AdminLookupRow;
    draft: OptionDraft;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    })
  );

  const activeCount = rows.filter((r) => r.isActive).length;
  const activeRow = rows.find((r) => r.id === activeId) ?? null;

  const groups = useMemo(() => {
    if (!grouped) return null;
    const map = new Map<string, AdminLookupRow[]>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const r of rows) {
      const g = r.group ?? "Applied";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    }
    return map;
  }, [rows, grouped]);

  async function refetch() {
    try {
      const res = await fetch(`/api/system/lookups?type=${type}`);
      if (res.ok) setRows(await res.json());
    } catch {
      /* keep optimistic state */
    }
    router.refresh(); // re-renders layout → dropdowns/Kanban pick up changes
  }

  // ---- CRUD -----------------------------------------------------------------

  async function submitDraft(draft: OptionDraft) {
    if (editing && draft.label !== editing.label && editing.usageCount > 0) {
      // renames touch applications — confirm first
      setRenameConfirm({ row: editing, draft });
      return;
    }
    await persistDraft(editing, draft);
  }

  async function persistDraft(target: AdminLookupRow | null, draft: OptionDraft) {
    setBusy(true);
    setServerError(null);
    try {
      const res = target
        ? await fetch(`/api/system/lookups/${target.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draft),
          })
        : await fetch("/api/system/lookups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, ...draft }),
          });
      if (!res.ok) {
        setServerError(await readApiError(res));
        return;
      }
      toast.success(
        target
          ? target.label !== draft.label
            ? `Renamed "${target.label}" to "${draft.label}"${target.usageCount ? ` · ${target.usageCount} application${target.usageCount === 1 ? "" : "s"} updated` : ""}`
            : `Updated "${draft.label}"`
          : `Added "${draft.label}"`
      );
      setDialogOpen(false);
      setRenameConfirm(null);
      await refetch();
    } catch {
      setServerError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: AdminLookupRow) {
    const next = !row.isActive;
    const snapshot = rows;
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, isActive: next } : r))
    );
    const res = await fetch(`/api/system/lookups/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    }).catch(() => null);
    if (!res?.ok) {
      setRows(snapshot);
      toast.error(res ? await readApiError(res) : "Network error");
      return;
    }
    toast.success(`"${row.label}" ${next ? "activated" : "deactivated"}`);
    router.refresh();
  }

  async function handleDelete(row: AdminLookupRow, reassignTo?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/system/lookups/${row.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reassignTo ? { reassignTo } : {}),
      });
      if (!res.ok) {
        toast.error(await readApiError(res));
        return;
      }
      toast.success(
        reassignTo
          ? `Deleted "${row.label}" · ${row.usageCount} application${row.usageCount === 1 ? "" : "s"} moved to "${reassignTo}"`
          : `Deleted "${row.label}"`
      );
      setDeleting(null);
      await refetch();
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate(row: AdminLookupRow) {
    setDeleting(null);
    await toggleActive(row);
  }

  // ---- drag & drop ----------------------------------------------------------

  function groupOfId(id: string): string | null {
    if (String(id).startsWith("group:")) return String(id).slice(6);
    return rows.find((r) => r.id === id)?.group ?? null;
  }

  function handleDragOver(event: DragOverEvent) {
    if (!grouped) return;
    const { active, over } = event;
    if (!over) return;
    const fromGroup = rows.find((r) => r.id === active.id)?.group ?? "Applied";
    const toGroup = groupOfId(String(over.id));
    if (!toGroup || toGroup === fromGroup) return;
    // move the dragged row into the hovered group so dnd-kit can sort there
    setRows((prev) =>
      prev.map((r) => (r.id === active.id ? { ...r, group: toGroup } : r))
    );
  }

  async function persistOrder(next: AdminLookupRow[], snapshot: AdminLookupRow[]) {
    setRows(next);
    const res = await fetch("/api/system/lookups/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        items: next.map((r) => ({
          id: r.id,
          ...(grouped && { group: r.group }),
        })),
      }),
    }).catch(() => null);
    if (!res?.ok) {
      setRows(snapshot);
      toast.error(res ? await readApiError(res) : "Failed to save order");
      return;
    }
    toast.success("Order saved");
    router.refresh();
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const snapshot = rows;

    if (!grouped) {
      if (active.id === over.id) return;
      const oldIndex = rows.findIndex((r) => r.id === active.id);
      const newIndex = rows.findIndex((r) => r.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = [...rows];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      persistOrder(next, snapshot);
      return;
    }

    // grouped (STATUS): rebuild the flat order group-by-group
    const dragged = rows.find((r) => r.id === active.id);
    if (!dragged) return;
    const byGroup = new Map<string, AdminLookupRow[]>();
    for (const g of GROUP_ORDER) byGroup.set(g, []);
    for (const r of rows) {
      if (r.id === dragged.id) continue;
      const g = r.group ?? "Applied";
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(r);
    }
    const targetGroup = dragged.group ?? "Applied"; // updated live in onDragOver
    const list = byGroup.get(targetGroup) ?? [];
    let insertAt = list.length;
    if (!String(over.id).startsWith("group:")) {
      const overIndex = list.findIndex((r) => r.id === over.id);
      if (overIndex >= 0) insertAt = overIndex;
    }
    list.splice(insertAt, 0, { ...dragged, group: targetGroup });
    byGroup.set(targetGroup, list);
    const next = GROUP_ORDER.flatMap((g) => byGroup.get(g) ?? []);
    persistOrder(next, snapshot);
  }

  // ---- render ---------------------------------------------------------------

  const rowProps = (row: AdminLookupRow) => ({
    row,
    singular: meta.singular,
    lastOption: rows.length <= 1,
    lastActive: activeCount <= 1,
    onEdit: (r: AdminLookupRow) => {
      setEditing(r);
      setServerError(null);
      setDialogOpen(true);
    },
    onDelete: setDeleting,
    onToggle: toggleActive,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} option{rows.length === 1 ? "" : "s"} · drag to reorder
          {grouped ? " or move between pipeline groups" : ""}
        </p>
        <Button
          size="sm"
          className="gap-1.5 rounded-lg shadow-sm"
          onClick={() => {
            setEditing(null);
            setServerError(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add option
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-14 text-center">
          <p className="text-sm font-medium">No options yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add your first {meta.singular} to get started.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          {grouped && groups ? (
            <div className="space-y-4">
              {Array.from(groups.entries()).map(([group, groupRows]) => (
                <GroupSection key={group} group={group} count={groupRows.length}>
                  <SortableContext
                    items={groupRows.map((r) => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {groupRows.map((row) => (
                      <SortableRow key={row.id} {...rowProps(row)} />
                    ))}
                  </SortableContext>
                </GroupSection>
              ))}
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-0 sm:overflow-hidden sm:rounded-xl sm:border sm:bg-card sm:shadow-sm sm:[&>div:last-child_.border-b]:border-b-0">
              <SortableContext
                items={rows.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                {rows.map((row) => (
                  <SortableRow key={row.id} {...rowProps(row)} />
                ))}
              </SortableContext>
            </div>
          )}
          <DragOverlay dropAnimation={{ duration: 200 }}>
            {activeRow ? (
              <div className="rounded-lg border bg-card shadow-lg">
                <RowContent {...rowProps(activeRow)} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <OptionDialog
        type={type}
        editing={editing}
        existingLabels={rows
          .filter((r) => r.id !== editing?.id)
          .map((r) => r.label)}
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        onSubmit={submitDraft}
        submitting={busy}
        serverError={serverError}
      />

      <DeleteOptionDialog
        row={deleting}
        siblings={rows.filter((r) => r.id !== deleting?.id)}
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        onDelete={handleDelete}
        onDeactivate={handleDeactivate}
        busy={busy}
      />

      {/* rename confirmation — renames cascade to applications */}
      <Dialog
        open={renameConfirm !== null}
        onOpenChange={(o) => {
          if (!o) setRenameConfirm(null);
        }}
      >
        <DialogContent className="rounded-xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Rename “{renameConfirm?.row.label}” to “{renameConfirm?.draft.label}”?
            </DialogTitle>
            <DialogDescription>
              {renameConfirm?.row.usageCount} application
              {renameConfirm?.row.usageCount === 1 ? "" : "s"} will be updated
              to the new label.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-lg"
              onClick={() => setRenameConfirm(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              className="rounded-lg"
              disabled={busy}
              onClick={() =>
                renameConfirm &&
                persistDraft(renameConfirm.row, renameConfirm.draft)
              }
            >
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
