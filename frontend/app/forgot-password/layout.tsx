import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("Forgot Password", "/forgot-password");
}

export default function ForgotPasswordSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
