import { unlink } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";

type RouteContext = { params: { docId: string } };

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const document = await db.document.findUnique({
      where: { id: params.docId },
    });
    if (!document) return jsonError("Document not found", 404);

    await db.document.delete({ where: { id: params.docId } });

    try {
      await unlink(path.resolve(process.cwd(), document.storedPath));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        console.error(`Failed to delete file ${document.storedPath}:`, error);
      }
    }

    return NextResponse.json({ deleted: params.docId });
  } catch (error) {
    console.error(`DELETE /api/documents/${params.docId} failed:`, error);
    return jsonError("Internal server error", 500);
  }
}
