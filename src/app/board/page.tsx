import type { Metadata } from "next";
import { BoardPage } from "@/components/board/board-page";
import { PAGE_SEO } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const { title, description, path } = PAGE_SEO.board;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
  };
}

export default function Board() {
  return <BoardPage />;
}
