import type { MetadataRoute } from "next";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/account", "/checkout", "/cart", "/wishlist", "/login", "/register", "/forgot-password", "/reset-password"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
