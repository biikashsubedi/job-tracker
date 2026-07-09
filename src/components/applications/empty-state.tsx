"use client";

import { Plus, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

function Illustration() {
  return (
    <svg
      width="160"
      height="120"
      viewBox="0 0 160 120"
      fill="none"
      aria-hidden="true"
    >
      {/* back card */}
      <rect
        x="30"
        y="14"
        width="84"
        height="58"
        rx="10"
        className="fill-muted"
        transform="rotate(-4 30 14)"
      />
      {/* front card */}
      <rect
        x="38"
        y="30"
        width="92"
        height="64"
        rx="10"
        className="fill-card stroke-border"
        strokeWidth="1.5"
      />
      <rect x="50" y="44" width="40" height="6" rx="3" className="fill-muted" />
      <rect
        x="50"
        y="58"
        width="62"
        height="5"
        rx="2.5"
        className="fill-muted"
      />
      <rect
        x="50"
        y="70"
        width="52"
        height="5"
        rx="2.5"
        className="fill-muted"
      />
      <circle
        cx="122"
        cy="88"
        r="17"
        className="fill-card stroke-primary/40"
        strokeWidth="3"
      />
      <line
        x1="134"
        y1="100"
        x2="146"
        y2="112"
        className="stroke-primary/40"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptyState({
  filtered,
  onAdd,
  onClearFilters,
}: {
  filtered: boolean;
  onAdd: () => void;
  onClearFilters: () => void;
}) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-16 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <SearchX className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-base font-semibold">No matching applications</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Nothing matches your current search and filters. Try adjusting or
          clearing them.
        </p>
        <Button
          variant="outline"
          className="mt-5 rounded-lg"
          onClick={onClearFilters}
        >
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-16 text-center shadow-sm">
      <Illustration />
      <h2 className="mt-6 text-base font-semibold">No applications yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Start tracking your job hunt — add the roles you&apos;ve applied to and
        follow them from applied to hired.
      </p>
      <Button className="mt-5 gap-1.5 rounded-lg shadow-sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add your first application
      </Button>
    </div>
  );
}
