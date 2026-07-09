import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { serializeApplicationsCsv } from "@/lib/csv";
import type { ApplicationRow } from "@/lib/types";

// always read live data — never prerender at build time
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apps = await db.application.findMany({
      orderBy: { createdAt: "asc" },
    });
    const csv = serializeApplicationsCsv(
      apps.map((a) => ({
        ...a,
        dateApplied: a.dateApplied?.toISOString() ?? null,
        deadline: a.deadline?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })) as ApplicationRow[]
    );
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="jobtrack-applications-${date}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/applications/export failed:", error);
    return jsonError("Internal server error", 500);
  }
}
