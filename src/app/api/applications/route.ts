import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonError, parseJsonBody, validationError } from "@/lib/api";
import { getLookupValues } from "@/lib/lookups";
import { buildApplicationSchemas, buildListQuerySchema } from "@/lib/validation";

/** Parse a non-negative integer query param, or null when absent/invalid. */
function intParam(value: string | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(
    Array.from(req.nextUrl.searchParams.entries()).filter(
      ([, value]) => value !== ""
    )
  );
  const parsed = buildListQuerySchema(await getLookupValues()).safeParse(raw);
  if (!parsed.success) return validationError(parsed.error);

  const { search, status, platform, workMode, roleType, sortBy, sortDir } =
    parsed.data;

  // Optional pagination — when `limit` is omitted the full list is returned
  // (the board and dashboard need every row).
  const limit = intParam(req.nextUrl.searchParams.get("limit"));
  const offset = intParam(req.nextUrl.searchParams.get("offset")) ?? 0;

  const where: Prisma.ApplicationWhereInput = {
    ...(status && { status }),
    ...(platform && { platform }),
    ...(workMode && { workMode }),
    ...(roleType && { roleType }),
    ...(search && {
      OR: [
        { position: { contains: search } },
        { company: { contains: search } },
        { techStack: { contains: search } },
      ],
    }),
  };

  try {
    const [applications, total] = await Promise.all([
      db.application.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        ...(limit != null ? { take: limit, skip: offset } : {}),
        include: {
          // active Resume / Cover Letter only — powers the table indicator chips
          documents: {
            where: { isActive: true, kind: { in: ["Resume", "Cover Letter"] } },
            select: { id: true, kind: true, filename: true },
          },
        },
      }),
      db.application.count({ where }),
    ]);
    // This data must always be live — never served from a browser/proxy cache.
    return NextResponse.json(applications, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
        "X-Total-Count": String(total),
      },
    });
  } catch (error) {
    console.error("GET /api/applications failed:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await parseJsonBody(req);
  if (body === null) return jsonError("Request body must be valid JSON", 400);

  const { create } = buildApplicationSchemas(await getLookupValues());
  const parsed = create.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const application = await db.application.create({
      data: {
        ...parsed.data,
        statusHistory: {
          create: { fromStatus: null, toStatus: parsed.data.status },
        },
      },
      include: { statusHistory: true },
    });
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error("POST /api/applications failed:", error);
    return jsonError("Internal server error", 500);
  }
}
