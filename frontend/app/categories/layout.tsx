import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("categories");
}

export default function CategoriesSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
