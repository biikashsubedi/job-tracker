import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, parseJsonBody } from "@/lib/api";
import { applicationCreateSchema } from "@/lib/validation";

const MAX_IMPORT_ROWS = 1000;

export async function POST(req: NextRequest) {
  const body = await parseJsonBody(req);
  if (body === null) return jsonError("Request body must be valid JSON", 400);

  const rows = (body as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) {
    return jsonError('Body must be { rows: [...] }', 400);
  }
  if (rows.length === 0) return jsonError("No rows to import", 400);
  if (rows.length > MAX_IMPORT_ROWS) {
    return jsonError(`Too many rows — the limit is ${MAX_IMPORT_ROWS}`, 400);
  }

  const valid: Array<ReturnType<typeof applicationCreateSchema.parse>> = [];
  const rejected: Array<{ index: number; error: string }> = [];

  rows.forEach((row, i) => {
    const parsed = applicationCreateSchema.safeParse(row);
    if (parsed.success) valid.push(parsed.data);
    else {
      const issue = parsed.error.issues[0];
      rejected.push({
        index: i + 1,
        error: `${issue.path.join(".") || "row"}: ${issue.message}`,
      });
    }
  });

  try {
    // create each with its initial StatusEvent, atomically
    await db.$transaction(
      valid.map((data) =>
        db.application.create({
          data: {
            ...data,
            statusHistory: {
              create: { fromStatus: null, toStatus: data.status },
            },
          },
        })
      )
    );
    return NextResponse.json(
      { created: valid.length, rejected },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/applications/import failed:", error);
    return jsonError("Internal server error", 500);
  }
}
