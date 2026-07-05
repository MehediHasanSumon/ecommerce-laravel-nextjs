'use client';
import Link from 'next/link';
import { ChevronRight, CreditCard, Plus, Trash2 } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { toast } from 'sonner';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';

const PAYMENT_METHODS = [
  { id: '1', type: 'Visa', last4: '4242', expires: '12/27', isDefault: true },
  { id: '2', type: 'Mastercard', last4: '8765', expires: '08/26', isDefault: false },
];

export default function PaymentPage() {
  const { confirmDelete, deleteConfirmationDialog } = useDeleteConfirmation();

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
          <Link href="/account" className="hover:text-foreground">
            Account
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Payment Methods</span>
        </nav>
        <div className="flex gap-8">
          <AccountSidebar active="payment" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-extrabold">Payment Methods</h1>
              <button
                onClick={() => toast('Add payment form coming soon!')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus size={15} /> Add Card
              </button>
            </div>

            <div className="space-y-4">
              {PAYMENT_METHODS.map((method) => (
                <div
                  key={method.id}
                  className={`bg-card border rounded-2xl p-5 flex items-center gap-4 ${method.isDefault ? 'border-primary' : 'border-border'}`}
                >
                  <div className="w-12 h-8 bg-gradient-to-r from-primary to-primary/70 rounded-lg flex items-center justify-center">
                    <CreditCard size={18} className="text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">
                        {method.type} ending in {method.last4}
                      </p>
                      {method.isDefault && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Expires {method.expires}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!method.isDefault && (
                      <button
                        onClick={() => toast('Set as default')}
                        className="text-xs text-primary hover:underline"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => confirmDelete({
                        onConfirm: () => {
                          toast(`${method.type} card removed`);
                        },
                      })}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-muted rounded-2xl text-sm text-muted-foreground">
              <p className="font-semibold mb-1">Security Note</p>
              <p>
                We use industry-standard 256-bit SSL encryption. Your payment data is never stored
                on our servers.
              </p>
            </div>
          </div>
        </div>
      </main>
      {deleteConfirmationDialog}
      <Footer />
    </div>
  );
}
