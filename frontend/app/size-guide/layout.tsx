import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("sizeGuide");
}

export default function SizeGuideSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
