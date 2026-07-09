import type { Metadata } from "next";
import { entityMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return entityMetadata("content-page", "faq");
}

export default function FaqSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
