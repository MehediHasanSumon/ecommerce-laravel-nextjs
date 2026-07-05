import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const SECTIONS = [
  {
    title: 'Information We Collect',
    content:
      'We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support. This includes your name, email address, shipping address, payment information, and order history.',
  },
  {
    title: 'How We Use Your Information',
    content:
      'We use the information we collect to process transactions, send order confirmations and shipping updates, provide customer support, send promotional communications (with your consent), improve our services, and comply with legal obligations.',
  },
  {
    title: 'Information Sharing',
    content:
      'We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who assist us in operating our website and conducting our business, provided they agree to keep your information confidential.',
  },
  {
    title: 'Data Security',
    content:
      'We implement industry-standard security measures including 256-bit SSL encryption, secure data storage, and regular security audits to protect your personal information from unauthorized access, disclosure, or alteration.',
  },
  {
    title: 'Cookies & Tracking',
    content:
      'We use cookies to enhance your browsing experience, remember your preferences, and analyze site traffic. You can control cookie settings through your browser. Some features may not function properly if you disable cookies.',
  },
  {
    title: 'Your Rights',
    content:
      'You have the right to access, correct, or delete your personal data. You may also opt out of marketing communications at any time. To exercise these rights, please contact us at privacy@luxecart.com.',
  },
  {
    title: 'Contact Us',
    content:
      'If you have questions about this Privacy Policy, please contact us at privacy@luxecart.com or write to us at 123 Commerce St, New York, NY 10001.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12 pb-16">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Privacy Policy</span>
        </nav>

        <h1 className="text-3xl font-extrabold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: June 19, 2026</p>

        <p className="text-muted-foreground leading-relaxed mb-8">
          At LuxeCart, we take your privacy seriously. This Privacy Policy describes how we collect,
          use, and protect your personal information when you use our services.
        </p>

        <div className="space-y-8">
          {SECTIONS.map(({ title, content }) => (
            <div key={title} className="border-b border-border pb-8 last:border-0">
              <h2 className="font-bold text-lg mb-3">{title}</h2>
              <p className="text-muted-foreground leading-relaxed text-sm">{content}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
