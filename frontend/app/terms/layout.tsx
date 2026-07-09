import type { Metadata } from "next";
import { entityMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return entityMetadata("content-page", "terms");
}

export default function TermsSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
