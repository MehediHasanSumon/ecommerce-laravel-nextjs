import type { Metadata } from "next";
import { entityMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return entityMetadata("content-page", "about");
}

export default function AboutSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
