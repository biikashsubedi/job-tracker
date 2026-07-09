"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STATUSES,
  PLATFORMS,
  WORK_MODES,
  ROLE_TYPES,
  PLATFORM_COLORS,
  WORK_MODE_COLORS,
  type Platform,
  type WorkMode,
} from "@/lib/constants";
import { statusColor } from "./badges";
import { SEARCH_INPUT_ID } from "@/components/keyboard-shortcuts";
import { cn } from "@/lib/utils";

export interface Filters {
  status: string;
  platform: string;
  workMode: string;
  roleType: string;
}

export const EMPTY_FILTERS: Filters = {
  status: "",
  platform: "",
  workMode: "",
  roleType: "",
};

export const SORT_OPTIONS = [
  { value: "updatedAt", label: "Last Updated" },
  { value: "dateApplied", label: "Date Applied" },
  { value: "deadline", label: "Deadline" },
  { value: "company", label: "Company" },
  { value: "skillMatch", label: "Skill Match" },
] as const;

const FILTER_DEFS: {
  key: keyof Filters;
  label: string;
  allLabel: string;
  options: readonly string[];
}[] = [
  { key: "status", label: "Status", allLabel: "All statuses", options: STATUSES },
  { key: "platform", label: "Platform", allLabel: "All platforms", options: PLATFORMS },
  { key: "workMode", label: "Work Mode", allLabel: "All work modes", options: WORK_MODES },
  { key: "roleType", label: "Role Type", allLabel: "All role types", options: ROLE_TYPES },
];

function chipClasses(key: keyof Filters, value: string): string {
  if (key === "status") {
    const c = statusColor(value);
    return cn(c.bg, c.text, c.border);
  }
  if (key === "platform") {
    const c = PLATFORM_COLORS[value as Platform];
    if (c) return cn(c.bg, c.text, "border-transparent");
  }
  if (key === "workMode") {
    const c = WORK_MODE_COLORS[value as WorkMode];
    if (c) return cn(c.bg, c.text, "border-transparent");
  }
  return "bg-secondary text-secondary-foreground border-transparent";
}

interface ToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortDir: "asc" | "desc";
  onSortDirChange: (value: "asc" | "desc") => void;
}

export function Toolbar({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
}: ToolbarProps) {
  const activeFilters = FILTER_DEFS.filter(({ key }) => filters[key] !== "");

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={SEARCH_INPUT_ID}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search…  (press /)"
            className="h-9 rounded-lg bg-card pl-9 shadow-sm"
          />
        </div>

        {FILTER_DEFS.map(({ key, label, allLabel, options }) => (
          <Select
            key={key}
            value={filters[key] || "all"}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, [key]: v === "all" ? "" : v })
            }
          >
            <SelectTrigger
              className={cn(
                "h-9 w-auto gap-1.5 rounded-lg bg-card text-sm shadow-sm",
                filters[key] && "border-primary/40 text-foreground"
              )}
            >
              <SelectValue placeholder={label}>
                {filters[key] || label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{allLabel}</SelectItem>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {key === "status" ? (
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          statusColor(option).dot
                        )}
                      />
                      {option}
                    </span>
                  ) : (
                    option
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        <div className="ml-auto flex items-center gap-1.5">
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="h-9 w-[150px] rounded-lg bg-card text-sm shadow-sm">
              <span className="text-muted-foreground">Sort:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg bg-card shadow-sm"
            onClick={() => onSortDirChange(sortDir === "asc" ? "desc" : "asc")}
            title={sortDir === "asc" ? "Ascending" : "Descending"}
          >
            {sortDir === "asc" ? (
              <ArrowUpNarrowWide className="h-4 w-4" />
            ) : (
              <ArrowDownWideNarrow className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map(({ key, label }) => (
            <span
              key={key}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-1 text-xs font-medium transition-colors",
                chipClasses(key, filters[key])
              )}
            >
              <span className="opacity-60">{label}:</span> {filters[key]}
              <button
                onClick={() => onFiltersChange({ ...filters, [key]: "" })}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10"
                aria-label={`Remove ${label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => onFiltersChange(EMPTY_FILTERS)}
            className="ml-1 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
