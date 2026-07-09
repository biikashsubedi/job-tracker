import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { DOCUMENT_KINDS } from "@/lib/constants";
import {
  MAX_DOC_SIZE,
  sanitizeFilename,
  validateDocFile,
} from "@/lib/documents";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const application = await db.application.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!application) return jsonError("Application not found", 404);

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return jsonError("Expected multipart/form-data", 400);
    }

    const file = form.get("file");
    const kind = form.get("kind");

    if (!(file instanceof File)) {
      return jsonError('A "file" field is required', 400);
    }
    if (
      typeof kind !== "string" ||
      !(DOCUMENT_KINDS as readonly string[]).includes(kind)
    ) {
      return jsonError(
        `"kind" must be one of: ${DOCUMENT_KINDS.join(", ")}`,
        400
      );
    }
    if (file.size > MAX_DOC_SIZE) {
      return jsonError("File is too large — the limit is 10 MB", 413);
    }
    const invalid = validateDocFile(file.name, file.type, file.size);
    if (invalid) return jsonError(invalid, 400);

    const safeName = sanitizeFilename(file.name);
    const storedPath = `uploads/${params.id}/${createId()}-${safeName}`;
    const absolute = path.join(process.cwd(), storedPath);

    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, Buffer.from(await file.arrayBuffer()));

    try {
      const document = await db.document.create({
        data: {
          filename: file.name,
          storedPath,
          kind,
          applicationId: params.id,
        },
      });
      return NextResponse.json(document, { status: 201 });
    } catch (error) {
      // don't leave an orphaned file if the row insert fails
      await unlink(absolute).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error(`POST /api/applications/${params.id}/documents failed:`, error);
    return jsonError("Internal server error", 500);
  }
}
