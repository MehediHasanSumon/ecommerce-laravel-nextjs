import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("bestSellers");
}

export default function BestSellersSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
