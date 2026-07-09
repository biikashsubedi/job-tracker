import { unlink } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, parseJsonBody, validationError } from "@/lib/api";
import { applicationUpdateSchema } from "@/lib/validation";

type RouteContext = { params: { id: string } };

const fullInclude = {
  documents: { orderBy: { uploadedAt: "asc" as const } },
  statusHistory: { orderBy: { changedAt: "asc" as const } },
};

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const application = await db.application.findUnique({
      where: { id: params.id },
      include: fullInclude,
    });
    if (!application) return jsonError("Application not found", 404);
    return NextResponse.json(application);
  } catch (error) {
    console.error(`GET /api/applications/${params.id} failed:`, error);
    return jsonError("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const body = await parseJsonBody(req);
  if (body === null) return jsonError("Request body must be valid JSON", 400);

  const parsed = applicationUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const existing = await db.application.findUnique({
      where: { id: params.id },
      select: { status: true },
    });
    if (!existing) return jsonError("Application not found", 404);

    const statusChanged =
      parsed.data.status !== undefined && parsed.data.status !== existing.status;

    const application = await db.$transaction(async (tx) => {
      if (statusChanged) {
        await tx.statusEvent.create({
          data: {
            applicationId: params.id,
            fromStatus: existing.status,
            toStatus: parsed.data.status!,
          },
        });
      }
      return tx.application.update({
        where: { id: params.id },
        data: parsed.data,
        include: fullInclude,
      });
    });

    return NextResponse.json(application);
  } catch (error) {
    console.error(`PATCH /api/applications/${params.id} failed:`, error);
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const application = await db.application.findUnique({
      where: { id: params.id },
      include: { documents: { select: { storedPath: true } } },
    });
    if (!application) return jsonError("Application not found", 404);

    // Cascades to documents and status events (onDelete: Cascade)
    await db.application.delete({ where: { id: params.id } });

    let deletedFiles = 0;
    for (const doc of application.documents) {
      try {
        await unlink(path.resolve(process.cwd(), doc.storedPath));
        deletedFiles++;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") {
          console.error(`Failed to delete file ${doc.storedPath}:`, error);
        }
      }
    }

    return NextResponse.json({ deleted: params.id, deletedFiles });
  } catch (error) {
    console.error(`DELETE /api/applications/${params.id} failed:`, error);
    return jsonError("Internal server error", 500);
  }
}
