import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("newArrivals");
}

export default function NewArrivalsSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
