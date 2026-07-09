import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("deals");
}

export default function DealsSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
