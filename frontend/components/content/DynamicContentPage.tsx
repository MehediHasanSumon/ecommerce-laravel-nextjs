"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Globe, Heart, Package, Search, ShoppingBag, Star, Users } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { fetchContentPage, type ContentPage } from "@/services/content-page-service";
import { cn } from "@/lib/utils";

type IconKey = "users" | "package" | "star" | "globe" | "heart" | "shopping-bag";
type FaqItem = { question: string; answer: string };
type FaqCategory = { name: string; items: FaqItem[] };
type LegalSection = { title: string; content: string };

const icons: Record<IconKey, typeof ShoppingBag> = {
  users: Users,
  package: Package,
  star: Star,
  globe: Globe,
  heart: Heart,
  "shopping-bag": ShoppingBag,
};

function iconFor(value: unknown) {
  return icons[(typeof value === "string" ? value : "shopping-bag") as IconKey] ?? ShoppingBag;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function array<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function DynamicContentPage({ slug }: { slug: "about" | "faq" | "privacy" | "terms" }) {
  const [page, setPage] = useState<ContentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);

    fetchContentPage(slug, { signal: controller.signal })
      .then((nextPage) => {
        setPage(nextPage);
        document.title = nextPage.seo.title || nextPage.title;
        const description = nextPage.seo.description || nextPage.description;
        if (description) {
          let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
          if (!meta) {
            meta = document.createElement("meta");
            meta.name = "description";
            document.head.appendChild(meta);
          }
          meta.content = description;
        }
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "CanceledError") {
          setFailed(true);
          setPage(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slug]);

  if (loading) return <ContentSkeleton />;

  if (failed || !page) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="mb-3 text-2xl font-bold">Page unavailable</h1>
          <Link href="/" className="text-primary hover:underline">Return home</Link>
        </main>
        <Footer />
      </div>
    );
  }

  if (page.template === "about") return <AboutContent page={page} />;
  if (page.template === "faq") return <FaqContent page={page} />;
  return <LegalContent page={page} />;
}

function ContentSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 pb-16">
        <div className="mb-6 h-5 w-36 animate-pulse rounded bg-muted" />
        <div className="mb-8 h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function AboutContent({ page }: { page: ContentPage }) {
  const payload = page.payload;
  const mission = (payload.mission ?? {}) as Record<string, unknown>;
  const cta = (mission.cta ?? {}) as Record<string, unknown>;
  const stats = array<Record<string, unknown>>(payload.stats);
  const values = array<Record<string, unknown>>(payload.values);
  const team = array<Record<string, unknown>>(payload.team);

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main>
        <section className="bg-gradient-to-b from-primary/5 to-transparent px-4 py-16 text-center">
          <div className="mx-auto max-w-4xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <ShoppingBag size={32} className="text-primary-foreground" />
            </div>
            <h1 className="mb-4 text-4xl font-extrabold md:text-5xl">{page.title}</h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">{page.description}</p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((item) => {
              const Icon = iconFor(item.icon);
              return (
                <div key={text(item.label)} className="rounded-2xl border border-border bg-card p-6 text-center">
                  <Icon size={24} className="mx-auto mb-3 text-primary" />
                  <p className="mb-1 text-3xl font-extrabold">{text(item.value)}</p>
                  <p className="text-sm text-muted-foreground">{text(item.label)}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-extrabold">{text(mission.title, "Our Mission")}</h2>
              {array<string>(mission.body).map((paragraph) => (
                <p key={paragraph} className="mb-4 leading-relaxed text-muted-foreground">{paragraph}</p>
              ))}
              {text(cta.href) ? (
                <Link href={text(cta.href)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                  {text(cta.label, "Shop Now")}
                </Link>
              ) : null}
            </div>
            <div className="relative h-80 overflow-hidden rounded-2xl">
              <Image src={text(mission.image, "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&auto=format&fit=crop")} alt={text(mission.title, "Our mission")} fill className="object-cover" />
            </div>
          </div>
        </section>

        <section className="bg-muted/50 px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-12 text-center text-3xl font-extrabold">Our Values</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {values.map((item) => {
                const Icon = iconFor(item.icon);
                return (
                  <div key={text(item.title)} className="rounded-2xl border border-border bg-card p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Icon size={22} className="text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold">{text(item.title)}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{text(item.description)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="mb-12 text-center text-3xl font-extrabold">Meet the Team</h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {team.map((member) => (
              <div key={text(member.name)} className="text-center">
                <div className="mx-auto mb-3 h-24 w-24 overflow-hidden rounded-full border-4 border-border">
                  <Image src={text(member.avatar)} alt={text(member.name)} width={96} height={96} className="object-cover" />
                </div>
                <p className="text-sm font-bold">{text(member.name)}</p>
                <p className="text-xs text-muted-foreground">{text(member.role)}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function FaqContent({ page }: { page: ContentPage }) {
  const categories = array<FaqCategory>(page.payload.categories);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(categories[0]?.name ?? "");
  const items = useMemo(() => categories.find((category) => category.name === activeCategory)?.items ?? [], [activeCategory, categories]);
  const filtered = searchQuery
    ? items.filter((item) => `${item.question} ${item.answer}`.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 pb-16">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-extrabold">{page.title}</h1>
          <p className="text-muted-foreground">{page.description} <Link href="/contact" className="text-primary hover:underline">Contact us</Link>.</p>
        </div>
        <div className="relative mb-8">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search FAQs..." className="w-full rounded-2xl border border-transparent bg-muted py-3.5 pl-12 pr-4 text-sm outline-none transition-colors focus:border-primary focus:bg-background" />
        </div>
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button key={category.name} type="button" onClick={() => setActiveCategory(category.name)} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors", activeCategory === category.name ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>{category.name}</button>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card px-6">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="mb-1 font-semibold">No results found</p>
              <p className="text-sm">Try different keywords or <Link href="/contact" className="text-primary hover:underline">contact support</Link></p>
            </div>
          ) : filtered.map((item) => <FAQItem key={item.question} item={item} />)}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function FAQItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button type="button" onClick={() => setOpen((value) => !value)} className="group flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-primary">
        <span className="text-sm font-semibold transition-colors group-hover:text-primary">{item.question}</span>
        <ChevronDown size={16} className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.answer}</p> : null}
    </div>
  );
}

function LegalContent({ page }: { page: ContentPage }) {
  const sections = array<LegalSection>(page.payload.sections);
  const contact = (page.payload.contact ?? {}) as Record<string, unknown>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 pb-16">
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <span className="font-medium text-foreground">{page.title}</span>
        </nav>
        <h1 className="mb-2 text-3xl font-extrabold">{page.title}</h1>
        <p className="mb-8 text-muted-foreground">{text(page.payload.updatedLabel)}</p>
        <p className="mb-8 leading-relaxed text-muted-foreground">{page.description}</p>
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title} className="border-b border-border pb-8 last:border-0">
              <h2 className="mb-3 text-lg font-bold">{section.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{section.content}</p>
            </div>
          ))}
        </div>
        {text(contact.label) ? (
          <div className="mt-8 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            {text(contact.href) ? <Link href={text(contact.href)} className="text-primary hover:underline">{text(contact.label)}</Link> : text(contact.label)}
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
