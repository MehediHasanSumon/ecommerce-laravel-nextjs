import type { Metadata } from "next";
import { entityMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return entityMetadata("content-page", "privacy");
}

export default function PrivacySeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
