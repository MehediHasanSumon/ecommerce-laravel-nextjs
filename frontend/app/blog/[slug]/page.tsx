'use client';
import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Clock, ArrowLeft } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MOCK_BLOG_POSTS } from '@/mock/blog';

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const post = MOCK_BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
          <Link href="/blog" className="text-primary hover:underline">
            ← Back to Blog
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const relatedPosts = MOCK_BLOG_POSTS.filter(
    (p) => p.id !== post.id && p.category === post.category
  ).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight size={14} />
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium truncate max-w-xs">{post.title}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {post.category}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-4 mb-4 leading-tight">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <Image
                  src={post.author.avatar ?? ''}
                  alt={post.author.name}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
                <span className="font-medium text-foreground">{post.author.name}</span>
              </div>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {post.readTime} min read
              </span>
              <span>{post.publishedAt.slice(0, 10)}</span>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden mb-8">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>

            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed text-base mb-4">{post.excerpt}</p>
              <p className="text-muted-foreground leading-relaxed text-base mb-4">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <h2 className="text-xl font-bold mt-8 mb-4">Key Takeaways</h2>
              <ul className="space-y-2 text-muted-foreground">
                {post.tags.map((tag) => (
                  <li key={tag} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground leading-relaxed text-base mt-6">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa
                qui officia deserunt mollit anim id est laborum.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <Link
              href="/blog"
              className="inline-flex items-center gap-2 mt-8 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft size={14} /> Back to Blog
            </Link>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Author */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold mb-4">About the Author</h3>
              <div className="flex items-center gap-3">
                <Image
                  src={post.author.avatar ?? ''}
                  alt={post.author.name}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
                <div>
                  <p className="font-semibold text-sm">{post.author.name}</p>
                  <p className="text-xs text-muted-foreground">Content Writer & Lifestyle Expert</p>
                </div>
              </div>
            </div>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-bold mb-4">Related Articles</h3>
                <div className="space-y-4">
                  {relatedPosts.map((rp) => (
                    <Link key={rp.id} href={`/blog/${rp.slug}`} className="group flex gap-3">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                        <Image src={rp.coverImage} alt={rp.title} fill className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                          {rp.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{rp.readTime} min</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
