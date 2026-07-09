import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonError, parseJsonBody, validationError } from "@/lib/api";
import { applicationCreateSchema, listQuerySchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(
    Array.from(req.nextUrl.searchParams.entries()).filter(
      ([, value]) => value !== ""
    )
  );
  const parsed = listQuerySchema.safeParse(raw);
  if (!parsed.success) return validationError(parsed.error);

  const { search, status, platform, workMode, roleType, sortBy, sortDir } =
    parsed.data;

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
    const applications = await db.application.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
    });
    return NextResponse.json(applications);
  } catch (error) {
    console.error("GET /api/applications failed:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await parseJsonBody(req);
  if (body === null) return jsonError("Request body must be valid JSON", 400);

  const parsed = applicationCreateSchema.safeParse(body);
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
