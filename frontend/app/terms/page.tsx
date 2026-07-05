import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12 pb-16">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Terms & Conditions</span>
        </nav>

        <h1 className="text-3xl font-extrabold mb-2">Terms & Conditions</h1>
        <p className="text-muted-foreground mb-8">Last updated: June 19, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">
          {[
            {
              title: '1. Acceptance of Terms',
              content:
                'By accessing and using LuxeCart, you accept and agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.',
            },
            {
              title: '2. Account Registration',
              content:
                'To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.',
            },
            {
              title: '3. Products & Pricing',
              content:
                'All products listed are subject to availability. Prices are subject to change without notice. We reserve the right to refuse or cancel orders at our discretion, including in cases of pricing errors.',
            },
            {
              title: '4. Orders & Payment',
              content:
                'By placing an order, you agree to provide accurate payment information. All transactions are processed securely. Orders are confirmed only upon successful payment authorization.',
            },
            {
              title: '5. Returns & Refunds',
              content:
                'We offer a 30-day return policy for most items. Products must be returned in original condition. Some items may be excluded. Please review our Return Policy for complete details.',
            },
            {
              title: '6. Intellectual Property',
              content:
                'All content on LuxeCart, including logos, images, and text, is the property of LuxeCart or its licensors and is protected by copyright laws. Unauthorized use is prohibited.',
            },
            {
              title: '7. Limitation of Liability',
              content:
                'LuxeCart shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services or products purchased through our platform.',
            },
            {
              title: '8. Governing Law',
              content:
                'These Terms are governed by the laws of the State of New York, United States. Any disputes shall be resolved in the courts of New York County.',
            },
          ].map(({ title, content }) => (
            <div key={title} className="border-b border-border pb-8 last:border-0">
              <h2 className="font-bold text-lg mb-3">{title}</h2>
              <p className="text-muted-foreground leading-relaxed text-sm">{content}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-muted rounded-xl text-sm text-muted-foreground">
          For questions about these Terms, contact us at{' '}
          <a href="mailto:legal@luxecart.com" className="text-primary hover:underline">
            legal@luxecart.com
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
