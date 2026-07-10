import "server-only";
import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./db";
import {
  EMPTY_LOOKUPS,
  type AllLookups,
  type LookupType,
  type LookupOptionDTO,
} from "./lookup-colors";

const LOOKUP_TAG = "lookups";

/** Which Application (and StatusEvent) column stores each lookup type's label. */
const FIELD_FOR_TYPE: Record<LookupType, string> = {
  STATUS: "status",
  PLATFORM: "platform",
  WORK_MODE: "workMode",
  ROLE_TYPE: "roleType",
  INTERVIEW_ROUND: "interviewRound",
};

// Cross-request cache, invalidated via revalidateTag("lookups").
const loadAll = unstable_cache(
  async (): Promise<AllLookups> => {
    // Inactive options are included so existing applications can still render
    // their label (muted); the LookupProvider filters them out of dropdowns.
    const rows = await db.lookupOption.findMany({
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
      select: {
        type: true,
        label: true,
        color: true,
        group: true,
        isActive: true,
      },
    });
    const result: AllLookups = {
      STATUS: [],
      PLATFORM: [],
      WORK_MODE: [],
      ROLE_TYPE: [],
      INTERVIEW_ROUND: [],
    };
    for (const r of rows) {
      if (r.type in result) {
        result[r.type as LookupType].push({
          label: r.label,
          color: r.color,
          group: r.group,
          isActive: r.isActive,
        });
      }
    }
    return result;
  },
  ["lookups-all"],
  { tags: [LOOKUP_TAG] }
);

/** All active options grouped by type, sorted by sortOrder. Request-deduped. */
export const getAllLookups = cache(async (): Promise<AllLookups> => {
  try {
    return await loadAll();
  } catch {
    return EMPTY_LOOKUPS;
  }
});

export async function getOptions(type: LookupType): Promise<LookupOptionDTO[]> {
  return (await getAllLookups())[type];
}

/** Valid label arrays per type, for building request-validation schemas. */
export async function getLookupValues(): Promise<import("./validation").LookupValues> {
  const all = await getAllLookups();
  return {
    status: all.STATUS.map((o) => o.label),
    roleType: all.ROLE_TYPE.map((o) => o.label),
    workMode: all.WORK_MODE.map((o) => o.label),
    platform: all.PLATFORM.map((o) => o.label),
    interviewRound: all.INTERVIEW_ROUND.map((o) => o.label),
  };
}

/** Just the label strings for a type (handy for validation). */
export async function getLabels(type: LookupType): Promise<string[]> {
  return (await getOptions(type)).map((o) => o.label);
}

export function revalidateLookups() {
  revalidateTag(LOOKUP_TAG);
}

/**
 * Rename a lookup option. In one transaction, updates the option AND rewrites
 * every Application (and StatusEvent, for statuses) row that stored the old
 * label — so nothing orphans. Used by the /system admin pages.
 */
export async function renameLookupOption(
  id: string,
  newLabel: string
): Promise<void> {
  const trimmed = newLabel.trim();
  const option = await db.lookupOption.findUnique({ where: { id } });
  if (!option) throw new Error("Lookup option not found");
  if (!trimmed) throw new Error("Label cannot be empty");
  if (trimmed === option.label) return;

  const field = FIELD_FOR_TYPE[option.type as LookupType];

  await db.$transaction(async (tx) => {
    await tx.lookupOption.update({
      where: { id },
      data: { label: trimmed },
    });
    if (field) {
      await tx.application.updateMany({
        where: { [field]: option.label },
        data: { [field]: trimmed },
      });
    }
    if (option.type === "STATUS") {
      await tx.statusEvent.updateMany({
        where: { toStatus: option.label },
        data: { toStatus: trimmed },
      });
      await tx.statusEvent.updateMany({
        where: { fromStatus: option.label },
        data: { fromStatus: trimmed },
      });
    }
  });

  revalidateLookups();
}
