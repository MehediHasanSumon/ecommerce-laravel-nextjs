import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await sitemapEntries();

  return entries.map((entry) => ({
    url: entry.url,
    lastModified: entry.lastModified,
    changeFrequency: (entry.changeFrequency ?? "daily") as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: entry.priority ?? 0.7,
  }));
}
