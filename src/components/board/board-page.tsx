"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApplicationRow } from "@/lib/types";
import { STATUS_GROUPS, groupForStatus } from "@/lib/status-groups";
import { BoardColumn } from "./board-column";
import { BoardCardContent } from "./board-card";
import { StatusPicker, type PickerState } from "./status-picker";

function dropPointFromEvent(event: DragEndEvent): { x: number; y: number } {
  const activator = event.activatorEvent;
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  if (activator instanceof MouseEvent || activator instanceof PointerEvent) {
    x = activator.clientX;
    y = activator.clientY;
  } else if (
    typeof TouchEvent !== "undefined" &&
    activator instanceof TouchEvent &&
    activator.touches[0]
  ) {
    x = activator.touches[0].clientX;
    y = activator.touches[0].clientY;
  }
  return { x: x + event.delta.x, y: y + event.delta.y };
}

export function BoardPage() {
  const [apps, setApps] = useState<ApplicationRow[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerState | null>(null);

  const sensors = useSensors(
    // distance keeps plain clicks (status menu button) from starting drags
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // long-press to drag on touch so columns still scroll naturally
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    })
  );

  useEffect(() => {
    fetch("/api/applications")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setApps)
      .catch(() => {
        setApps([]);
        toast.error("Failed to load applications");
      });
  }, []);

  const byGroup = useMemo(() => {
    const map = new Map<string, ApplicationRow[]>();
    for (const group of STATUS_GROUPS) map.set(group.key, []);
    for (const app of apps ?? []) {
      map.get(groupForStatus(app.status).key)?.push(app);
    }
    return map;
  }, [apps]);

  const activeApp = useMemo(
    () => apps?.find((a) => a.id === activeId) ?? null,
    [apps, activeId]
  );

  const applyStatus = useCallback(
    async (app: ApplicationRow, status: string) => {
      setPicker(null);
      if (status === app.status) return;
      const snapshot = apps;
      setApps(
        (prev) =>
          prev?.map((a) => (a.id === app.id ? { ...a, status } : a)) ?? prev
      );
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setApps(snapshot ?? null);
        toast.error("Failed to update status");
        return;
      }
      const updated: ApplicationRow = await res.json();
      setApps(
        (prev) => prev?.map((a) => (a.id === updated.id ? updated : a)) ?? prev
      );
      toast.success(`${app.position} → ${status}`);
    },
    [apps]
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setPicker(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const app = apps?.find((a) => a.id === active.id);
    const group = STATUS_GROUPS.find((g) => g.key === over.id);
    if (!app || !group) return;
    if (groupForStatus(app.status).key === group.key) return;

    if (group.statuses.length === 1) {
      // only one possible status in this group — no need to ask
      applyStatus(app, group.statuses[0]);
      return;
    }
    const { x, y } = dropPointFromEvent(event);
    setPicker({ app, group, x, y });
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="mx-auto w-full max-w-[1600px] shrink-0 px-4 pb-3 pt-6 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Board</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {apps === null
            ? "Loading your pipeline…"
            : `${apps.length} application${apps.length === 1 ? "" : "s"} · drag cards between stages`}
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <div className="mx-auto flex h-full max-w-[1600px] items-stretch gap-3 overflow-x-auto px-4 pb-6 sm:gap-4 sm:px-6">
          {apps === null ? (
            STATUS_GROUPS.map((group) => (
              <div
                key={group.key}
                className="flex w-[290px] shrink-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <div className={`h-1 ${group.accentBar}`} />
                <div className="border-b px-3 py-3">
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-2 p-2">
                  <Skeleton className="h-28 w-full rounded-xl" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                </div>
              </div>
            ))
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              {STATUS_GROUPS.map((group) => (
                <BoardColumn
                  key={group.key}
                  group={group}
                  apps={byGroup.get(group.key) ?? []}
                  onChangeStatus={applyStatus}
                />
              ))}
              <DragOverlay dropAnimation={{ duration: 200 }}>
                {activeApp ? (
                  <BoardCardContent app={activeApp} overlay />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      <StatusPicker
        picker={picker}
        onPick={applyStatus}
        onClose={() => setPicker(null)}
      />
    </div>
  );
}
