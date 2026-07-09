import type { Metadata } from "next";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { PAGE_SEO } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const { title, description, path } = PAGE_SEO.dashboard;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
  };
}

export default function Dashboard() {
  return <DashboardPage />;
}
