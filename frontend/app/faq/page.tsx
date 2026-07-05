'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/utils/format';
import { selectCurrencyFingerprint, useSettingsStore } from '@/store/settings-store';

function faqCategories() {
  return {
  'Orders & Shipping': [
    {
      q: 'How long does shipping take?',
      a: 'Standard shipping takes 3-5 business days. Express shipping (1-2 days) is available at checkout.',
    },
    {
      q: 'How can I track my order?',
      a: "You'll receive a tracking number via email once your order ships. You can also track orders in your Account Dashboard.",
    },
    {
      q: 'Do you offer free shipping?',
      a: `Yes! We offer free standard shipping on all orders over ${formatPrice(75)}. This applies to the contiguous United States.`,
    },
    {
      q: 'Can I change my delivery address?',
      a: 'You can change your address within 1 hour of placing the order. Contact our support team immediately for assistance.',
    },
  ],
  'Returns & Refunds': [
    {
      q: 'What is your return policy?',
      a: 'We offer a 30-day hassle-free return policy. Items must be in original condition with tags attached.',
    },
    {
      q: 'How do I start a return?',
      a: "Go to My Account → Orders → select the order → click 'Return Item'. We'll email you a prepaid return label.",
    },
    {
      q: 'When will I get my refund?',
      a: 'Refunds are processed within 3-5 business days of receiving your return. It may take an additional 2-3 days to appear on your statement.',
    },
  ],
  Payments: [
    {
      q: 'What payment methods do you accept?',
      a: 'We accept Visa, Mastercard, American Express, PayPal, Apple Pay, and Google Pay.',
    },
    {
      q: 'Is my payment information secure?',
      a: 'Absolutely. All transactions are encrypted with 256-bit SSL. We never store your full card details.',
    },
    {
      q: 'Can I use a promo code?',
      a: 'Yes! Enter your promo code at checkout. Valid codes include LUXE20, SAVE10, WELCOME15.',
    },
  ],
  Products: [
    {
      q: 'Are your products authentic?',
      a: 'Yes, 100%. We only sell genuine products directly sourced from authorized brand distributors.',
    },
    {
      q: 'What if a product is out of stock?',
      a: "Click 'Notify Me' on the product page and we'll email you when it's back in stock.",
    },
    {
      q: 'Do you have a size guide?',
      a: 'Yes! Each product page includes a size guide. For additional help, contact our support team.',
    },
  ],
  };
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 hover:text-primary transition-colors group"
      >
        <span className="font-semibold text-sm group-hover:text-primary transition-colors">
          {q}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && <p className="text-sm text-muted-foreground leading-relaxed pb-4">{a}</p>}
    </div>
  );
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Orders & Shipping');
  useSettingsStore(selectCurrencyFingerprint);

  const FAQ_CATEGORIES = faqCategories();
  const categories = Object.keys(FAQ_CATEGORIES);
  const items = FAQ_CATEGORIES[activeCategory as keyof typeof FAQ_CATEGORIES] ?? [];
  const filtered = searchQuery
    ? items.filter(
        (item) =>
          item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12 pb-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold mb-3">Frequently Asked Questions</h1>
          <p className="text-muted-foreground">
            Find answers to common questions below. Can&apos;t find what you need?{' '}
            <Link href="/contact" className="text-primary hover:underline">
              Contact us
            </Link>
            .
          </p>
        </div>

        <div className="relative mb-8">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full pl-12 pr-4 py-3.5 bg-muted rounded-2xl border border-transparent focus:border-primary focus:bg-background outline-none text-sm transition-colors"
          />
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl px-6">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="font-semibold mb-1">No results found</p>
              <p className="text-sm">
                Try different keywords or{' '}
                <Link href="/contact" className="text-primary hover:underline">
                  contact support
                </Link>
              </p>
            </div>
          ) : (
            filtered.map((item) => <FAQItem key={item.q} q={item.q} a={item.a} />)
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

