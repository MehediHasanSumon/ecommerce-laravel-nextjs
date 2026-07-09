import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("press");
}

export default function PressSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
