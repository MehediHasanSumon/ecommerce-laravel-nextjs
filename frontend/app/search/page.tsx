import type { Metadata } from "next";
import SearchPageClient from "@/components/search/SearchPageClient";
import { searchMetadata } from "@/lib/seo";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }): Promise<Metadata> {
  const params = await searchParams;
  return searchMetadata(params.q);
}

export default function SearchPage() {
  return <SearchPageClient />;
}
