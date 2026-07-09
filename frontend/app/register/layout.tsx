import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("Register", "/register");
}

export default function RegisterSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
