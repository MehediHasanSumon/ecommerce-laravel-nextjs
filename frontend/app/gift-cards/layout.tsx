import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("giftCards");
}

export default function GiftCardsSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
