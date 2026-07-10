import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseJsonBody, validationError } from "@/lib/api";
import { LOOKUP_COLOR_NAMES, LOOKUP_TYPES } from "@/lib/lookup-colors";
import { GROUP_ORDER } from "@/lib/status-groups";
import {
  createOption,
  listOptionsWithUsage,
  LookupAdminError,
} from "@/lib/lookups-admin";

const typeSchema = z.enum(
  LOOKUP_TYPES as [string, ...string[]]
);

const createSchema = z.object({
  type: typeSchema,
  label: z.string().trim().min(1, "Label is required").max(60),
  color: z.enum(LOOKUP_COLOR_NAMES as [string, ...string[]]),
  group: z.enum(GROUP_ORDER).nullish(),
});

export async function GET(req: NextRequest) {
  const parsed = typeSchema.safeParse(req.nextUrl.searchParams.get("type"));
  if (!parsed.success) {
    return jsonError("Query param `type` must be a valid lookup type", 400);
  }
  try {
    const options = await listOptionsWithUsage(
      parsed.data as (typeof LOOKUP_TYPES)[number]
    );
    return NextResponse.json(options);
  } catch (error) {
    console.error("GET /api/system/lookups failed:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await parseJsonBody(req);
  if (body === null) return jsonError("Request body must be valid JSON", 400);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const created = await createOption({
      type: parsed.data.type as (typeof LOOKUP_TYPES)[number],
      label: parsed.data.label,
      color: parsed.data.color,
      group: parsed.data.group ?? null,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof LookupAdminError) {
      return jsonError(error.message, error.status);
    }
    console.error("POST /api/system/lookups failed:", error);
    return jsonError("Internal server error", 500);
  }
}
