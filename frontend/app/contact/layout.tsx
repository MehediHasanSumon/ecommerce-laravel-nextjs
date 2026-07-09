import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("contact");
}

export default function ContactSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
