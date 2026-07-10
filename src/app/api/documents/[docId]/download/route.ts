import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { EXTENSION_MIME, extensionOf, sanitizeFilename } from "@/lib/documents";

type RouteContext = { params: { docId: string } };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const document = await db.document.findUnique({
      where: { id: params.docId },
    });
    if (!document) return jsonError("Document not found", 404);

    const absolute = path.resolve(process.cwd(), document.storedPath);
    let data: Buffer;
    try {
      data = await readFile(absolute);
    } catch {
      return jsonError("File is missing on disk", 404);
    }

    const contentType =
      EXTENSION_MIME[extensionOf(document.filename)] ??
      "application/octet-stream";
    // ASCII-safe fallback plus RFC 5987 encoding for the original name
    const asciiName = sanitizeFilename(document.filename);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(data.length),
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
        // Stored files are immutable (a new upload creates a new id), so the
        // browser can cache aggressively — reopening the viewer is instant.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error(`GET /api/documents/${params.docId}/download failed:`, error);
    return jsonError("Internal server error", 500);
  }
}
