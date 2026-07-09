import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("brands");
}

export default function BrandsSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
