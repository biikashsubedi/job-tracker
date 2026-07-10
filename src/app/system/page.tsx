import type { Metadata } from "next";
import Link from "next/link";
import path from "path";
import { promises as fs } from "fs";
import {
  Briefcase,
  ChevronRight,
  Database,
  FileText,
  Settings,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  LOOKUP_TYPES,
  LOOKUP_TYPE_META,
  type LookupType,
} from "@/lib/lookup-colors";

export const metadata: Metadata = { title: "System" };
export const dynamic = "force-dynamic";

const FIELD_FOR_TYPE: Record<LookupType, "status" | "platform" | "workMode" | "roleType" | "interviewRound"> = {
  STATUS: "status",
  PLATFORM: "platform",
  WORK_MODE: "workMode",
  ROLE_TYPE: "roleType",
  INTERVIEW_ROUND: "interviewRound",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes;
  let u = -1;
  do {
    v /= 1024;
    u++;
  } while (v >= 1024 && u < units.length - 1);
  return `${v.toFixed(1)} ${units[u]}`;
}

async function databaseFileSize(): Promise<string | null> {
  try {
    const url = process.env.DATABASE_URL ?? "file:./dev.db";
    const rel = url.replace(/^file:/, "");
    const abs = path.isAbsolute(rel)
      ? rel
      : path.join(process.cwd(), "prisma", rel);
    const stat = await fs.stat(abs);
    return formatBytes(stat.size);
  } catch {
    return null;
  }
}

export default async function SystemPage() {
  const [allOptions, totalApps, totalDocs, dbSize] = await Promise.all([
    db.lookupOption.findMany({ select: { type: true, label: true } }),
    db.application.count(),
    db.document.count(),
    databaseFileSize(),
  ]);

  const optionCount = new Map<string, number>();
  const labelsByType = new Map<string, string[]>();
  for (const o of allOptions) {
    optionCount.set(o.type, (optionCount.get(o.type) ?? 0) + 1);
    labelsByType.set(o.type, [...(labelsByType.get(o.type) ?? []), o.label]);
  }

  // applications whose value belongs to each type's option set
  const usageCounts = await Promise.all(
    LOOKUP_TYPES.map((type) =>
      db.application.count({
        where: {
          [FIELD_FOR_TYPE[type]]: { in: labelsByType.get(type) ?? [] },
        },
      })
    )
  );

  const stats = [
    { label: "Applications", value: String(totalApps), icon: Briefcase },
    { label: "Documents", value: String(totalDocs), icon: FileText },
    { label: "Database size", value: dbSize ?? "—", icon: Database },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Settings className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System</h1>
          <p className="text-sm text-muted-foreground">
            Manage the dropdown options used across JobTrack.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 shadow-sm"
          >
            <s.icon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold leading-tight tabular-nums">
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Lookup options
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LOOKUP_TYPES.map((type, i) => {
          const meta = LOOKUP_TYPE_META[type];
          const count = optionCount.get(type) ?? 0;
          const used = usageCounts[i] as number;
          return (
            <Link
              key={type}
              href={`/system/${meta.slug}`}
              className="group flex items-center justify-between rounded-xl border bg-card px-4 py-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <div>
                <p className="font-medium">{meta.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {count} option{count === 1 ? "" : "s"} · used by {used}{" "}
                  application{used === 1 ? "" : "s"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
