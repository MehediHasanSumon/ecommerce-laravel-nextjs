import type { Metadata } from "next";
import NotFoundClient from "@/components/not-found/NotFoundClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "404 - Page Not Found",
    description: "The page you are looking for does not exist or may have been moved.",
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export default function NotFound() {
  return <NotFoundClient />;
}
