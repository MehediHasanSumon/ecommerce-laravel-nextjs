import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("blogs");
}

export default function BlogsSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
