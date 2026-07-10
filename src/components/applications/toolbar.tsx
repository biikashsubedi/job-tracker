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
import { useLookups } from "@/components/lookups/lookup-provider";
import type { LookupType } from "@/lib/lookup-colors";
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

const FILTER_META: {
  key: keyof Filters;
  label: string;
  allLabel: string;
  type: LookupType;
}[] = [
  { key: "status", label: "Status", allLabel: "All statuses", type: "STATUS" },
  { key: "platform", label: "Platform", allLabel: "All platforms", type: "PLATFORM" },
  { key: "workMode", label: "Work Mode", allLabel: "All work modes", type: "WORK_MODE" },
  { key: "roleType", label: "Role Type", allLabel: "All role types", type: "ROLE_TYPE" },
];

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
  const { options, colorFor } = useLookups();
  const activeFilters = FILTER_META.filter(({ key }) => filters[key] !== "");

  function chipClasses(type: LookupType, value: string): string {
    if (type === "STATUS") {
      const c = colorFor("STATUS", value);
      return cn(c.bg, c.text, c.border);
    }
    if (type === "PLATFORM" || type === "WORK_MODE") {
      const c = colorFor(type, value);
      return cn(c.badgeBg, c.badgeText, "border-transparent");
    }
    return "bg-secondary text-secondary-foreground border-transparent";
  }

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

        {FILTER_META.map(({ key, label, allLabel, type }) => (
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
              {options[type].map((option) => (
                <SelectItem key={option.label} value={option.label}>
                  {type === "STATUS" ? (
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          colorFor("STATUS", option.label).dot
                        )}
                      />
                      {option.label}
                    </span>
                  ) : (
                    option.label
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
          {activeFilters.map(({ key, label, type }) => (
            <span
              key={key}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-1 text-xs font-medium transition-colors",
                chipClasses(type, filters[key])
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
