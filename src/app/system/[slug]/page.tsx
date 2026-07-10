import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  LOOKUP_TYPES,
  LOOKUP_TYPE_META,
  type LookupType,
} from "@/lib/lookup-colors";
import { listOptionsWithUsage } from "@/lib/lookups-admin";
import { LookupManager } from "@/components/system/lookup-manager";

export const dynamic = "force-dynamic";

function typeForSlug(slug: string): LookupType | null {
  return (
    LOOKUP_TYPES.find((t) => LOOKUP_TYPE_META[t].slug === slug) ?? null
  );
}

export function generateStaticParams() {
  return LOOKUP_TYPES.map((t) => ({ slug: LOOKUP_TYPE_META[t].slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const type = typeForSlug(params.slug);
  return { title: type ? `${LOOKUP_TYPE_META[type].title} · System` : "System" };
}

export default async function SystemLookupPage({
  params,
}: {
  params: { slug: string };
}) {
  const type = typeForSlug(params.slug);
  if (!type) notFound();

  const meta = LOOKUP_TYPE_META[type];
  const rows = await listOptionsWithUsage(type);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/system"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        System
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {meta.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {type === "STATUS"
          ? "Statuses are grouped into the five pipeline stages that drive the Kanban board."
          : `Options shown in ${meta.singular} dropdowns and filters.`}
      </p>

      <div className="mt-6">
        <LookupManager type={type} initialRows={rows} />
      </div>
    </div>
  );
}
