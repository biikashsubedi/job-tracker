import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicationsPage } from "@/components/applications/applications-page";
import { PAGE_SEO } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const { title, description, path } = PAGE_SEO.home;
  return {
    // absolute keeps the homepage title free of the "| JobTrack" template suffix
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
  };
}

export default function Home() {
  return (
    <Suspense>
      <ApplicationsPage />
    </Suspense>
  );
}
