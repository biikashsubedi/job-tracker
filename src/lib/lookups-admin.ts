import "server-only";
import { db } from "./db";
import type { LookupType } from "./lookup-colors";
import { revalidateLookups } from "./lookups";

/** Which Application column stores each lookup type's label. */
const FIELD_FOR_TYPE: Record<LookupType, "status" | "platform" | "workMode" | "roleType" | "interviewRound"> = {
  STATUS: "status",
  PLATFORM: "platform",
  WORK_MODE: "workMode",
  ROLE_TYPE: "roleType",
  INTERVIEW_ROUND: "interviewRound",
};

/** Error with an HTTP status the API routes can pass straight through. */
export class LookupAdminError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
  }
}

export interface AdminLookupRow {
  id: string;
  type: LookupType;
  label: string;
  color: string;
  group: string | null;
  sortOrder: number;
  isActive: boolean;
  usageCount: number;
}

/** Applications currently storing each label of the given type. */
async function usageByLabel(type: LookupType): Promise<Map<string, number>> {
  const field = FIELD_FOR_TYPE[type];
  const rows = await db.application.groupBy({
    by: [field],
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    const label = r[field];
    if (label != null) map.set(label, r._count._all);
  }
  return map;
}

export async function usageCountFor(
  type: LookupType,
  label: string
): Promise<number> {
  return db.application.count({ where: { [FIELD_FOR_TYPE[type]]: label } });
}

export async function listOptionsWithUsage(
  type: LookupType
): Promise<AdminLookupRow[]> {
  const [options, usage] = await Promise.all([
    db.lookupOption.findMany({
      where: { type },
      orderBy: { sortOrder: "asc" },
    }),
    usageByLabel(type),
  ]);
  return options.map((o) => ({
    id: o.id,
    type: o.type as LookupType,
    label: o.label,
    color: o.color,
    group: o.group,
    sortOrder: o.sortOrder,
    isActive: o.isActive,
    usageCount: usage.get(o.label) ?? 0,
  }));
}

async function assertUniqueLabel(
  type: LookupType,
  label: string,
  excludeId?: string
) {
  const existing = await db.lookupOption.findMany({
    where: { type, ...(excludeId && { id: { not: excludeId } }) },
    select: { label: true },
  });
  if (existing.some((o) => o.label.toLowerCase() === label.toLowerCase())) {
    throw new LookupAdminError(
      `A ${type.toLowerCase().replace("_", " ")} option named "${label}" already exists`,
      409
    );
  }
}

export async function createOption(input: {
  type: LookupType;
  label: string;
  color: string;
  group?: string | null;
}): Promise<AdminLookupRow> {
  const label = input.label.trim();
  if (!label) throw new LookupAdminError("Label cannot be empty");
  await assertUniqueLabel(input.type, label);
  const max = await db.lookupOption.aggregate({
    where: { type: input.type },
    _max: { sortOrder: true },
  });
  const created = await db.lookupOption.create({
    data: {
      type: input.type,
      label,
      color: input.color,
      group: input.type === "STATUS" ? (input.group ?? "Applied") : null,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  revalidateLookups();
  return { ...created, type: created.type as LookupType, usageCount: 0 };
}

export async function updateOption(
  id: string,
  patch: {
    label?: string;
    color?: string;
    group?: string | null;
    isActive?: boolean;
  }
): Promise<AdminLookupRow> {
  const option = await db.lookupOption.findUnique({ where: { id } });
  if (!option) throw new LookupAdminError("Lookup option not found", 404);
  const type = option.type as LookupType;
  const field = FIELD_FOR_TYPE[type];

  const newLabel = patch.label?.trim();
  const renaming = newLabel !== undefined && newLabel !== option.label;
  if (renaming) {
    if (!newLabel) throw new LookupAdminError("Label cannot be empty");
    // allow pure case changes of the same option
    if (newLabel.toLowerCase() !== option.label.toLowerCase()) {
      await assertUniqueLabel(type, newLabel, id);
    }
  }

  // every type must keep at least one active option
  if (patch.isActive === false && option.isActive) {
    const otherActive = await db.lookupOption.count({
      where: { type: option.type, isActive: true, id: { not: id } },
    });
    if (otherActive === 0) {
      throw new LookupAdminError(
        "Cannot deactivate the last active option of this type",
        409
      );
    }
  }

  const data = {
    ...(renaming && { label: newLabel }),
    ...(patch.color !== undefined && { color: patch.color }),
    ...(type === "STATUS" &&
      patch.group !== undefined && { group: patch.group }),
    ...(patch.isActive !== undefined && { isActive: patch.isActive }),
  };

  // Renames cascade to every Application (and StatusEvent for statuses)
  // storing the old label — one transaction, nothing orphans.
  const updated = await db.$transaction(async (tx) => {
    const row = await tx.lookupOption.update({ where: { id }, data });
    if (renaming) {
      await tx.application.updateMany({
        where: { [field]: option.label },
        data: { [field]: newLabel },
      });
      if (type === "STATUS") {
        await tx.statusEvent.updateMany({
          where: { toStatus: option.label },
          data: { toStatus: newLabel },
        });
        await tx.statusEvent.updateMany({
          where: { fromStatus: option.label },
          data: { fromStatus: newLabel },
        });
      }
    }
    return row;
  });

  revalidateLookups();
  const usageCount = await usageCountFor(type, updated.label);
  return { ...updated, type, usageCount };
}

export async function deleteOption(
  id: string,
  reassignTo?: string
): Promise<void> {
  const option = await db.lookupOption.findUnique({ where: { id } });
  if (!option) throw new LookupAdminError("Lookup option not found", 404);
  const type = option.type as LookupType;
  const field = FIELD_FOR_TYPE[type];

  const siblings = await db.lookupOption.count({
    where: { type: option.type, id: { not: id } },
  });
  if (siblings === 0) {
    throw new LookupAdminError(
      "Cannot delete the last option of this type",
      409
    );
  }

  const usage = await usageCountFor(type, option.label);
  if (usage > 0) {
    if (!reassignTo) {
      throw new LookupAdminError(
        `"${option.label}" is used by ${usage} application${usage === 1 ? "" : "s"}. Choose a replacement before deleting.`,
        409
      );
    }
    const replacement = await db.lookupOption.findFirst({
      where: { type: option.type, label: reassignTo, id: { not: id } },
    });
    if (!replacement) {
      throw new LookupAdminError("Replacement option not found", 400);
    }
  }

  // reassignment + delete in one transaction
  await db.$transaction(async (tx) => {
    if (usage > 0 && reassignTo) {
      await tx.application.updateMany({
        where: { [field]: option.label },
        data: { [field]: reassignTo },
      });
      if (type === "STATUS") {
        await tx.statusEvent.updateMany({
          where: { toStatus: option.label },
          data: { toStatus: reassignTo },
        });
        await tx.statusEvent.updateMany({
          where: { fromStatus: option.label },
          data: { fromStatus: reassignTo },
        });
      }
    }
    await tx.lookupOption.delete({ where: { id } });
  });

  revalidateLookups();
}

/**
 * Persist a new order (and, for statuses dragged across pipeline groups, the
 * new group). `ids` is the full ordered list for the type.
 */
export async function reorderOptions(
  type: LookupType,
  items: { id: string; group?: string | null }[]
): Promise<void> {
  const existing = await db.lookupOption.findMany({
    where: { type },
    select: { id: true },
  });
  const known = new Set(existing.map((o) => o.id));
  if (
    items.length !== existing.length ||
    items.some((i) => !known.has(i.id))
  ) {
    throw new LookupAdminError("Reorder list must contain every option once");
  }
  await db.$transaction(
    items.map((item, index) =>
      db.lookupOption.update({
        where: { id: item.id },
        data: {
          sortOrder: index,
          ...(type === "STATUS" &&
            item.group !== undefined && { group: item.group }),
        },
      })
    )
  );
  revalidateLookups();
}
