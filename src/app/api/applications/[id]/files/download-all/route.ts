import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { sanitizeFilename } from "@/lib/documents";

type RouteContext = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const application = await db.application.findUnique({
      where: { id: params.id },
      include: {
        documents: {
          where: { isActive: true, kind: { in: ["Resume", "Cover Letter"] } },
        },
      },
    });
    if (!application) return jsonError("Application not found", 404);
    if (application.documents.length === 0) {
      return jsonError("No documents to download", 404);
    }

    const zip = new JSZip();
    let added = 0;
    for (const doc of application.documents) {
      try {
        const buf = await readFile(
          path.resolve(process.cwd(), doc.storedPath)
        );
        const label = doc.kind === "Resume" ? "Resume" : "Cover Letter";
        zip.file(`${label} - ${sanitizeFilename(doc.filename)}`, buf);
        added++;
      } catch {
        // file missing on disk — skip it
      }
    }
    if (added === 0) return jsonError("Document files are missing on disk", 404);

    const content = await zip.generateAsync({ type: "nodebuffer" });
    const base =
      sanitizeFilename(`${application.company}-${application.position}`) ||
      "documents";
    return new NextResponse(new Uint8Array(content), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(content.length),
        "Content-Disposition": `attachment; filename="${base}-documents.zip"`,
      },
    });
  } catch (error) {
    console.error(
      `GET /api/applications/${params.id}/files/download-all failed:`,
      error
    );
    return jsonError("Internal server error", 500);
  }
}
