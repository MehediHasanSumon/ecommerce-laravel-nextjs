import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("reviews");
}

export default function ReviewsSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
