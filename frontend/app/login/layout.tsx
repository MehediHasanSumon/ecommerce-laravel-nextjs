import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("Login", "/login");
}

export default function LoginSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
