import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("Admin", "/admin");
}

export default function AdminSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
