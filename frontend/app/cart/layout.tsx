import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("Cart", "/cart");
}

export default function CartSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
