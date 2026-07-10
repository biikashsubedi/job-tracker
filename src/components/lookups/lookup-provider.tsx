"use client";

import { createContext, useContext, useMemo } from "react";
import {
  colorClasses,
  type AllLookups,
  type ColorClasses,
  type LookupType,
} from "@/lib/lookup-colors";

interface LookupContextValue {
  /** active options only — what dropdowns, filters and Kanban columns show */
  options: AllLookups;
  /** color classes for a given option label within a type */
  colorFor: (type: LookupType, label: string) => ColorClasses;
  /** pipeline group of a status label (STATUS only) */
  groupOf: (statusLabel: string) => string | null;
  /** true when a label belongs to a deactivated option (render muted) */
  isInactive: (type: LookupType, label: string) => boolean;
}

const LookupContext = createContext<LookupContextValue | null>(null);

export function LookupProvider({
  value,
  children,
}: {
  value: AllLookups;
  children: React.ReactNode;
}) {
  const ctx = useMemo<LookupContextValue>(() => {
    const colorMaps = new Map<LookupType, Map<string, string>>();
    const inactiveSets = new Map<LookupType, Set<string>>();
    const groupMap = new Map<string, string | null>();
    const active: AllLookups = {
      STATUS: [],
      PLATFORM: [],
      WORK_MODE: [],
      ROLE_TYPE: [],
      INTERVIEW_ROUND: [],
    };
    (Object.keys(value) as LookupType[]).forEach((type) => {
      const m = new Map<string, string>();
      const inactive = new Set<string>();
      for (const o of value[type]) {
        m.set(o.label, o.color);
        if (type === "STATUS") groupMap.set(o.label, o.group);
        if (o.isActive) active[type].push(o);
        else inactive.add(o.label);
      }
      colorMaps.set(type, m);
      inactiveSets.set(type, inactive);
    });
    return {
      options: active,
      colorFor: (type, label) => colorClasses(colorMaps.get(type)?.get(label)),
      groupOf: (label) => groupMap.get(label) ?? null,
      isInactive: (type, label) => inactiveSets.get(type)?.has(label) ?? false,
    };
  }, [value]);

  return (
    <LookupContext.Provider value={ctx}>{children}</LookupContext.Provider>
  );
}

export function useLookups(): LookupContextValue {
  const ctx = useContext(LookupContext);
  if (!ctx) {
    throw new Error("useLookups must be used within a LookupProvider");
  }
  return ctx;
}
