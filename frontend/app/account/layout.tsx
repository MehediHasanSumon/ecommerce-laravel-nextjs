import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("Customer Account", "/account");
}

export default function AccountSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
