import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseJsonBody, validationError } from "@/lib/api";
import { LOOKUP_COLOR_NAMES } from "@/lib/lookup-colors";
import { GROUP_ORDER } from "@/lib/status-groups";
import {
  deleteOption,
  LookupAdminError,
  updateOption,
} from "@/lib/lookups-admin";

const patchSchema = z
  .object({
    label: z.string().trim().min(1, "Label is required").max(60),
    color: z.enum(LOOKUP_COLOR_NAMES as [string, ...string[]]),
    group: z.enum(GROUP_ORDER).nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  });

const deleteSchema = z.object({
  reassignTo: z.string().trim().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await parseJsonBody(req);
  if (body === null) return jsonError("Request body must be valid JSON", 400);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const updated = await updateOption(params.id, parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof LookupAdminError) {
      return jsonError(error.message, error.status);
    }
    console.error(`PATCH /api/system/lookups/${params.id} failed:`, error);
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // body is optional: { reassignTo?: string }
  const body = (await parseJsonBody(req)) ?? {};
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await deleteOption(params.id, parsed.data.reassignTo);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LookupAdminError) {
      return jsonError(error.message, error.status);
    }
    console.error(`DELETE /api/system/lookups/${params.id} failed:`, error);
    return jsonError("Internal server error", 500);
  }
}
