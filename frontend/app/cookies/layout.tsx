import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("cookies");
}

export default function CookiesSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
