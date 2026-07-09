import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("shipping");
}

export default function ShippingPolicySeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
