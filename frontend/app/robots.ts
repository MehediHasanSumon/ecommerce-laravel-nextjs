import type { MetadataRoute } from "next";

const appUrl = (process.env.NEXT_PUBLIC_CREATE_APP_URL ?? "http://localhost:4000").replace(/\/$/, "");

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
