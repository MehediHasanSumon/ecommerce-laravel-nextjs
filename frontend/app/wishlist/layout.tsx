import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("Wishlist", "/wishlist");
}

export default function WishlistSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
