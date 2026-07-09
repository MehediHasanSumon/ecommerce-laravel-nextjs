import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("Reset Password", "/reset-password");
}

export default function ResetPasswordSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
