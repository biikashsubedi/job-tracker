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
  validateUpload,
  verifyMagicBytes,
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
    // Job Description accepts any file type; other kinds are PDF/DOCX/TXT.
    const invalid = validateUpload(file.name, file.type, file.size, kind);
    if (invalid) return jsonError(invalid, 400);

    // Verify the real contents by magic bytes, not just the extension.
    const bytes = new Uint8Array(await file.arrayBuffer());
    const magicError = verifyMagicBytes(bytes, file.name, kind);
    if (magicError) return jsonError(magicError, 400);

    const safeName = sanitizeFilename(file.name);
    const storedPath = `uploads/${params.id}/${createId()}-${safeName}`;
    const absolute = path.join(process.cwd(), storedPath);

    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, bytes);

    // At most one active Resume and one active Cover Letter per application —
    // a new upload supersedes the previous active one (kept for version history).
    const isReplaceable = kind === "Resume" || kind === "Cover Letter";

    try {
      const document = await db.$transaction(async (tx) => {
        if (isReplaceable) {
          await tx.document.updateMany({
            where: { applicationId: params.id, kind, isActive: true },
            data: { isActive: false },
          });
        }
        const created = await tx.document.create({
          data: {
            filename: file.name,
            storedPath,
            kind,
            applicationId: params.id,
          },
        });
        // Bump the application so "Last update" reflects document activity.
        await tx.application.update({
          where: { id: params.id },
          data: { updatedAt: new Date() },
        });
        return created;
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
