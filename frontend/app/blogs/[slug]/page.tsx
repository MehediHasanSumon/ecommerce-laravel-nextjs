"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Clock, Copy, Link2, MessageCircle, Send } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchBlogDetail, submitBlogComment, type BlogDetailResponse } from "@/services/blog-service";

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [data, setData] = useState<BlogDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState({ author_name: "", author_email: "", content: "" });
  const [commentSent, setCommentSent] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchBlogDetail(slug, { signal: controller.signal })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug]);

  const url = useMemo(() => typeof window === "undefined" ? "" : window.location.href, []);
  const blog = data?.blog;
  const allowComments = blog ? blog.allow_comments_override ?? data?.settings.allow_comments : false;

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        {loading ? (
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <Skeleton className="h-10 w-4/5" />
              <Skeleton className="aspect-video w-full rounded-2xl" />
              <Skeleton className="h-80 w-full" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : !blog ? (
          <div className="py-24 text-center">
            <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
            <Link href="/blogs" className="text-primary hover:underline">Back to Blog</Link>
          </div>
        ) : (
          <>
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <ChevronRight size={14} />
              <Link href="/blogs" className="hover:text-foreground">Blog</Link>
              <ChevronRight size={14} />
              <span className="text-foreground font-medium truncate max-w-xs">{blog.title}</span>
            </nav>

            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2">
                <h1 className="text-3xl md:text-4xl font-extrabold mt-4 mb-4 leading-tight">{blog.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                  <span className="font-medium text-foreground">{blog.author?.name ?? "Author"}</span>
                  <span className="flex items-center gap-1"><Clock size={14} />{blog.reading_time_minutes} min read</span>
                  <span>{formatDate(blog.published_at)}</span>
                </div>
                <div className="relative aspect-video rounded-2xl overflow-hidden mb-8">
                  <Image src={blog.featured_image} alt={blog.title} fill unoptimized className="object-cover" priority />
                </div>
                <article className="prose prose-gray dark:prose-invert max-w-none">
                  {blog.content.split("\n").map((paragraph, index) => paragraph.trim() ? <p key={index} className="text-muted-foreground leading-relaxed text-base mb-4">{paragraph}</p> : null)}
                </article>
                <ShareButtons url={url} title={blog.title} />
                {allowComments ? (
                  <section className="mt-10 border-t border-border pt-8">
                    <h2 className="text-xl font-bold mb-4">Comments</h2>
                    <form
                      className="mb-6 grid gap-3 rounded-2xl border border-border bg-card p-4"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        await submitBlogComment(blog.slug, comment);
                        setComment({ author_name: "", author_email: "", content: "" });
                        setCommentSent(true);
                      }}
                    >
                      {commentSent ? <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Comment submitted for moderation.</p> : null}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input required placeholder="Name" value={comment.author_name} onChange={(event) => setComment((current) => ({ ...current, author_name: event.target.value }))} className="h-11 rounded-xl border border-border bg-background px-3 text-sm" />
                        <input required type="email" placeholder="Email" value={comment.author_email} onChange={(event) => setComment((current) => ({ ...current, author_email: event.target.value }))} className="h-11 rounded-xl border border-border bg-background px-3 text-sm" />
                      </div>
                      <textarea required placeholder="Comment" value={comment.content} onChange={(event) => setComment((current) => ({ ...current, content: event.target.value }))} className="min-h-28 rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                      <button className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Send size={14} /> Submit Comment</button>
                    </form>
                    <div className="space-y-3">
                      {blog.comments.map((item) => <div key={item.id} className="rounded-xl border border-border bg-card p-4"><p className="font-semibold">{item.author_name}</p><p className="mt-2 text-sm text-muted-foreground">{item.content}</p></div>)}
                    </div>
                  </section>
                ) : null}
                <Link href="/blogs" className="inline-flex items-center gap-2 mt-8 text-sm font-semibold text-primary hover:underline"><ArrowLeft size={14} /> Back to Blog</Link>
              </div>

              <aside className="space-y-6">
                {data?.settings.enable_related && data.related.length ? (
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <h3 className="font-bold mb-4">Related Articles</h3>
                    <div className="space-y-4">
                      {data.related.map((rp) => (
                        <Link key={rp.id} href={`/blogs/${rp.slug}`} className="group flex gap-3">
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0"><Image src={rp.featured_image} alt={rp.title} fill unoptimized className="object-cover" /></div>
                          <div className="min-w-0"><p className="text-xs font-semibold line-clamp-2 group-hover:text-primary transition-colors">{rp.title}</p><p className="text-xs text-muted-foreground mt-1">{rp.reading_time_minutes} min</p></div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function ShareButtons({ url, title }: { url: string; title: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const links = [
    { label: "Facebook", icon: Link2, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "X", icon: Send, href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "LinkedIn", icon: Link2, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
  ];
  return (
    <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
      <button type="button" onClick={() => navigator.clipboard?.writeText(url)} className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-semibold"><Copy size={14} /> Copy Link</button>
      {links.map(({ label, icon: Icon, href }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-semibold"><Icon size={14} /> {label}</a>)}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
