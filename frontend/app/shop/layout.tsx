import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("shop");
}

export default function ShopSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
