"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Clock, Search, User } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchBlogs, type BlogCard, type BlogListResponse } from "@/services/blog-service";

export default function BlogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<BlogListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const page = searchParams.get("page") ?? "1";
  const search = searchParams.get("search") ?? "";
  const sort = searchParams.get("sort") ?? "latest";

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchBlogs({ page, search, sort }, { signal: controller.signal })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, search, sort]);

  useEffect(() => setSearchInput(search), [search]);

  const pagination = data?.pagination;
  const settings = data?.settings;
  const blogs = data?.blogs ?? [];

  function updateQuery(next: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value === null || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    router.push(`/blogs?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Blog</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold mb-2">Blog</h1>
          <p className="text-muted-foreground">{settings?.seo.default_meta_description || "Style guides, product reviews, and lifestyle inspiration"}</p>
        </div>

        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {settings?.enable_search !== false ? (
            <form
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 md:max-w-md"
              onSubmit={(event) => {
                event.preventDefault();
                updateQuery({ search: searchInput, page: 1 });
              }}
            >
              <Search size={16} className="text-muted-foreground" />
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search blogs..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </form>
          ) : <span />}
          <select value={sort} onChange={(event) => updateQuery({ sort: event.target.value, page: 1 })} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="most_viewed">Most Viewed</option>
          </select>
        </div>

        {loading ? (
          <BlogSkeleton layout={settings?.layout ?? "grid"} />
        ) : blogs.length ? (
          <div className={settings?.layout === "list" ? "space-y-5" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
            {blogs.map((post) => settings?.layout === "list" ? (
              <BlogListItem key={post.id} post={post} settings={settings} />
            ) : (
              <BlogGridCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="font-semibold">No blog posts found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or sorting option.</p>
          </div>
        )}

        {pagination && pagination.last_page > 1 ? (
          <div className="mt-8 flex flex-wrap justify-end gap-2">
            <button disabled={pagination.current_page <= 1} onClick={() => updateQuery({ page: pagination.current_page - 1 })} className="rounded-lg bg-muted px-4 py-2 text-sm font-semibold disabled:opacity-50">Previous</button>
            {Array.from({ length: pagination.last_page }, (_, index) => index + 1).slice(0, 5).map((value) => (
              <button key={value} onClick={() => updateQuery({ page: value })} className={value === pagination.current_page ? "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" : "rounded-lg bg-muted px-4 py-2 text-sm font-semibold"}>{value}</button>
            ))}
            <button disabled={pagination.current_page >= pagination.last_page} onClick={() => updateQuery({ page: pagination.current_page + 1 })} className="rounded-lg bg-muted px-4 py-2 text-sm font-semibold disabled:opacity-50">Next</button>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

function BlogGridCard({ post }: { post: BlogCard }) {
  return (
    <Link href={`/blogs/${post.slug}`} className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 duration-300">
      <div className="relative aspect-video overflow-hidden">
        <Image src={post.featured_image} alt={post.title} fill unoptimized className="object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="p-5">
        <h2 className="font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-snug">{post.title}</h2>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{post.excerpt}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
          <span className="flex items-center gap-1"><User size={12} />{post.author?.name ?? "Author"}</span>
          <span className="flex items-center gap-1"><Clock size={12} />{post.reading_time_minutes} min read</span>
        </div>
      </div>
    </Link>
  );
}

function BlogListItem({ post, settings }: { post: BlogCard; settings?: BlogListResponse["settings"] }) {
  const options = settings?.list_options;
  return (
    <Link href={`/blogs/${post.slug}`} className="group flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md md:flex-row">
      {options?.enable_thumbnail !== false ? (
        <div className="relative aspect-video overflow-hidden rounded-xl bg-muted md:w-72 md:shrink-0">
          <Image src={post.featured_image} alt={post.title} fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <h2 className="font-bold line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h2>
        {options?.show_excerpt !== false ? <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p> : null}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {options?.show_author !== false ? <span>{post.author?.name ?? "Author"}</span> : null}
          {options?.show_published_date !== false ? <span>{formatDate(post.published_at)}</span> : null}
          {options?.show_reading_time !== false ? <span>{post.reading_time_minutes} min read</span> : null}
        </div>
      </div>
    </Link>
  );
}

function BlogSkeleton({ layout }: { layout: "grid" | "list" }) {
  if (layout === "list") {
    return <div className="space-y-5">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-44 w-full rounded-2xl" />)}</div>;
  }
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-80 w-full rounded-2xl" />)}</div>;
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
