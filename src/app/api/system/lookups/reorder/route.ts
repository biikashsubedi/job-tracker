import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseJsonBody, validationError } from "@/lib/api";
import { LOOKUP_TYPES, type LookupType } from "@/lib/lookup-colors";
import { GROUP_ORDER } from "@/lib/status-groups";
import { LookupAdminError, reorderOptions } from "@/lib/lookups-admin";

const reorderSchema = z.object({
  type: z.enum(LOOKUP_TYPES as [string, ...string[]]),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        group: z.enum(GROUP_ORDER).nullish(),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const body = await parseJsonBody(req);
  if (body === null) return jsonError("Request body must be valid JSON", 400);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await reorderOptions(
      parsed.data.type as LookupType,
      parsed.data.items.map((i) => ({ id: i.id, group: i.group }))
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LookupAdminError) {
      return jsonError(error.message, error.status);
    }
    console.error("POST /api/system/lookups/reorder failed:", error);
    return jsonError("Internal server error", 500);
  }
}
