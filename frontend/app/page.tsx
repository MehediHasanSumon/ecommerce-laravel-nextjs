import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";
import { getHomePageSections } from "@/lib/public-api";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("home");
}

export default async function HomePage() {
  const initialData = await getHomePageSections();

  return <HomePageClient initialData={initialData} />;
}
