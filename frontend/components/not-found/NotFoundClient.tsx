'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, Home, Search, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/settings/BrandLogo';
import { NAV_LINKS } from '@/constants';
import { cn } from '@/utils/cn';

const supportLinks = [
  { label: 'Collections', href: '/collections/new-arrivals' },
  { label: 'Contact', href: '/contact' },
];

export default function NotFoundClient() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const quickLinks = useMemo(
    () => [
      ...NAV_LINKS.filter((link) => ['Home', 'Shop', 'Categories', 'Brands'].includes(link.label)),
      ...supportLinks,
    ],
    [],
  );

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <BrandLogo href="/" className="w-36 shrink-0 sm:w-44" textClassName="text-lg sm:text-xl" />
          <Button type="button" variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.back()}>
            Go Back
          </Button>
        </header>

        <section className="flex flex-1 items-center py-10 lg:py-12">
          <div className="w-full max-w-2xl space-y-7">
            <div className="space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                Page not found
              </p>
              <h1 className="text-7xl font-black tracking-tight text-foreground sm:text-8xl lg:text-9xl">404</h1>
              <div className="space-y-3">
                <h2 className="max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                  Oops! This page could not be found.
                </h2>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  The page you&apos;re looking for doesn&apos;t exist or may have been moved. Try searching or use one of the links below.
                </p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="max-w-xl" role="search" aria-label="Search the store">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 transition focus-within:border-primary">
                <Search className="ml-2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products, categories or pages..."
                  className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button type="submit" size="sm" className="rounded-xl">
                  Search
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap gap-3">
              <Link href="/" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 active:scale-[0.99]">
                <Home className="h-4 w-4" aria-hidden="true" />
                Go Home
              </Link>
              <Link href="/shop" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted active:scale-[0.99]">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                Browse Products
              </Link>
              <Link href="/contact" className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted active:scale-[0.99]">
                Contact Support
              </Link>
            </div>

            <nav aria-label="Helpful links" className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Helpful links</p>
              <div className="flex flex-wrap gap-2">
                {quickLinks.map((link) => (
                  <Link
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    className={cn(
                      'rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </section>
      </div>
    </main>
  );
}
