'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, MapPin, Edit2, Trash2, Check } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { toast } from 'sonner';
import type { Address } from '@/types';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';

const INITIAL_ADDRESSES: Address[] = [
  {
    id: '1',
    label: 'Home',
    fullName: 'John Doe',
    phone: '+1 (555) 123-4567',
    street: '123 Park Avenue, Apt 4B',
    city: 'New York',
    state: 'NY',
    country: 'United States',
    zip: '10001',
    isDefault: true,
  },
  {
    id: '2',
    label: 'Office',
    fullName: 'John Doe',
    phone: '+1 (555) 987-6543',
    street: '456 Business Blvd, Suite 200',
    city: 'New York',
    state: 'NY',
    country: 'United States',
    zip: '10010',
  },
];

export default function AddressesPage() {
  const [mounted, setMounted] = useState(false);
  const [addresses, setAddresses] = useState(INITIAL_ADDRESSES);
  const { confirmDelete, deleteConfirmationDialog } = useDeleteConfirmation();
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSetDefault = (id: string) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    toast.success('Default address updated');
  };

  const handleDelete = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    toast('Address deleted', { icon: '🗑️' });
  };

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
          <span className="text-foreground font-medium">Addresses</span>
        </nav>

        <div className="flex gap-8">
          <AccountSidebar active="addresses" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-extrabold">Address Book</h1>
              <button
                onClick={() => toast('Add address form coming soon!')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus size={15} /> Add Address
              </button>
            </div>

            {!mounted ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`bg-card border rounded-2xl p-5 relative ${addr.isDefault ? 'border-primary' : 'border-border'}`}
                  >
                    {addr.isDefault && (
                      <span className="absolute top-4 right-4 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={10} /> Default
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin size={16} className="text-primary" />
                      <span className="font-bold text-sm">{addr.label}</span>
                    </div>
                    <p className="text-sm font-medium">{addr.fullName}</p>
                    <p className="text-sm text-muted-foreground">{addr.street}</p>
                    <p className="text-sm text-muted-foreground">
                      {addr.city}, {addr.state} {addr.zip}
                    </p>
                    <p className="text-sm text-muted-foreground">{addr.country}</p>
                    <p className="text-sm text-muted-foreground mt-1">{addr.phone}</p>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                      <button
                        onClick={() => toast('Edit form coming soon!')}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      {!addr.isDefault && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <button
                            onClick={() => handleSetDefault(addr.id)}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Set as Default
                          </button>
                          <span className="text-muted-foreground">·</span>
                          <button
                            onClick={() => confirmDelete({
                              onConfirm: () => handleDelete(addr.id),
                            })}
                            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      {deleteConfirmationDialog}
      <Footer />
    </div>
  );
}
