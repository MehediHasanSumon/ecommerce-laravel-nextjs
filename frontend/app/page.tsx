import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("home");
}

export default function HomePage() {
  return <HomePageClient />;
}
