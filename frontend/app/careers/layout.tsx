import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("careers");
}

export default function CareersSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
