'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Package, ShoppingBag, Home } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function OrderSuccessPage() {
  const [orderNumber, setOrderNumber] = useState('');
  useEffect(() => {
    const num = Math.floor(Math.random() * 9000 + 1000);
    setOrderNumber(`LX-20250619-${num}`);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={48} className="text-emerald-500" />
        </div>
        <h1 className="text-3xl font-extrabold mb-2">Order Confirmed! 🎉</h1>
        <p className="text-muted-foreground mb-2">
          Thank you for your purchase. Your order is being processed.
        </p>
        {orderNumber && <p className="font-bold text-primary text-lg mb-8">{orderNumber}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { title: 'Order Confirmed', desc: 'Your order has been placed', status: 'complete' },
            { title: 'Processing', desc: 'Being prepared for shipping', status: 'active' },
            { title: 'Delivery', desc: 'Est. 3-5 business days', status: 'pending' },
          ].map(({ title, desc, status }) => (
            <div
              key={title}
              className={`p-4 rounded-2xl border ${status === 'complete' ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950' : status === 'active' ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/50'}`}
            >
              <Package
                size={20}
                className={`mx-auto mb-2 ${status === 'complete' ? 'text-emerald-500' : status === 'active' ? 'text-primary' : 'text-muted-foreground'}`}
              />
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mb-8 text-left">
          <h2 className="font-bold mb-4">What happens next?</h2>
          <div className="space-y-3">
            {[
              "You'll receive a confirmation email with your order details",
              "We'll notify you when your order ships with a tracking number",
              'Your package will arrive within 3-5 business days',
              'You can track your order in your Account Dashboard',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/account/orders"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            <Package size={16} /> Track Order
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-xl font-semibold hover:bg-muted transition-colors"
          >
            <ShoppingBag size={16} /> Continue Shopping
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-xl font-semibold hover:bg-muted transition-colors"
          >
            <Home size={16} /> Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
