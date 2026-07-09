import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("returns");
}

export default function ReturnPolicySeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
