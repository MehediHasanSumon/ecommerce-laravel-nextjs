import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("flashSale");
}

export default function FlashSaleSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
