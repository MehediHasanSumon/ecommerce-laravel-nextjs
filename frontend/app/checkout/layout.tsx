import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("Checkout", "/checkout");
}

export default function CheckoutSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
