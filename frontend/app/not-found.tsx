import type { Metadata } from "next";
import NotFoundClient from "@/components/not-found/NotFoundClient";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("Page Not Found", "/404");
}

export default function NotFound() {
  return <NotFoundClient />;
}
