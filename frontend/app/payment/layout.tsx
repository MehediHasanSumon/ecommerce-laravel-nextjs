import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("Payment Status", "/payment");
}

export default function PaymentSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
