import type { Metadata } from "next";
import { entityMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return entityMetadata("category", slug);
}

export default function CategorySeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
