import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

type PublicInfoSection = {
  title: string;
  body: string;
};

export function PublicInfoPage({
  title,
  description,
  sections,
  cta,
}: {
  title: string;
  description: string;
  sections: PublicInfoSection[];
  cta?: { label: string; href: string };
}) {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 pb-16">
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-foreground">{title}</span>
        </nav>

        <section className="mb-10 rounded-2xl border border-border bg-card p-6 md:p-8">
          <h1 className="text-3xl font-extrabold md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            {description}
          </p>
          {cta ? (
            <Link
              href={cta.href}
              className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {cta.label}
            </Link>
          ) : null}
        </section>

        <div className="space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-lg font-bold">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
