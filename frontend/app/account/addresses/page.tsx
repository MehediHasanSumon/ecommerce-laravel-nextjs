'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, MapPin, Edit2, Trash2, Check, X } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { toast } from 'sonner';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { toAppError } from '@/lib/errors';
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  updateAddress,
  type CheckoutAddressPayload,
  type CustomerAddress,
} from '@/services/checkout-service';

type AddressForm = CheckoutAddressPayload & {
  isDefaultBilling: boolean;
  isDefaultShipping: boolean;
};

const emptyForm: AddressForm = {
  fullName: '',
  phone: '',
  alternativePhone: '',
  email: '',
  country: 'Bangladesh',
  state: '',
  district: '',
  city: '',
  area: '',
  postalCode: '',
  landmark: '',
  addressLabel: '',
  addressLine: '',
  isDefaultBilling: false,
  isDefaultShipping: false,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const { confirmDelete, deleteConfirmationDialog } = useDeleteConfirmation();

  useEffect(() => {
    setLoading(true);
    fetchAddresses()
      .then(setAddresses)
      .catch(() => {
        setAddresses([]);
        toast.error('Unable to load addresses.');
      })
      .finally(() => setLoading(false));
  }, []);

  const startAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (address: CustomerAddress) => {
    setEditingId(address.id);
    setForm({
      fullName: address.fullName,
      phone: address.phone,
      alternativePhone: address.alternativePhone ?? '',
      email: address.email ?? '',
      country: address.country,
      state: address.state,
      district: address.district,
      city: address.city,
      area: address.area ?? '',
      postalCode: address.postalCode ?? '',
      landmark: address.landmark ?? '',
      addressLabel: address.addressLabel ?? '',
      addressLine: address.addressLine,
      isDefaultBilling: address.isDefaultBilling,
      isDefaultShipping: address.isDefaultShipping,
    });
    setShowForm(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = editingId ? await updateAddress(editingId, form) : await createAddress(form);
      setAddresses((current) => {
        const next = editingId ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current];
        return next.map((item) => ({
          ...item,
          isDefaultBilling: saved.isDefaultBilling ? item.id === saved.id : item.isDefaultBilling,
          isDefaultShipping: saved.isDefaultShipping ? item.id === saved.id : item.isDefaultShipping,
        }));
      });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success(editingId ? 'Address updated.' : 'Address saved.');
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (address: CustomerAddress, type: 'billing' | 'shipping') => {
    try {
      const saved = await updateAddress(address.id, {
        fullName: address.fullName,
        phone: address.phone,
        alternativePhone: address.alternativePhone ?? '',
        email: address.email ?? '',
        country: address.country,
        state: address.state,
        district: address.district,
        city: address.city,
        area: address.area ?? '',
        postalCode: address.postalCode ?? '',
        landmark: address.landmark ?? '',
        addressLabel: address.addressLabel ?? '',
        addressLine: address.addressLine,
        isDefaultBilling: type === 'billing' ? true : address.isDefaultBilling,
        isDefaultShipping: type === 'shipping' ? true : address.isDefaultShipping,
      });
      setAddresses((current) =>
        current.map((item) => ({
          ...(item.id === saved.id ? saved : item),
          isDefaultBilling: saved.isDefaultBilling ? item.id === saved.id : item.isDefaultBilling,
          isDefaultShipping: saved.isDefaultShipping ? item.id === saved.id : item.isDefaultShipping,
        })),
      );
      toast.success('Default address updated.');
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((address) => address.id !== id));
      toast.success('Address deleted.');
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <ChevronRight size={14} />
          <Link href="/account" className="hover:text-foreground">Account</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Addresses</span>
        </nav>

        <div className="flex flex-col gap-4 md:flex-row md:gap-8">
          <AccountSidebar active="addresses" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-extrabold">Address Book</h1>
              <button
                onClick={startAdd}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus size={15} /> Add Address
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-sm">{editingId ? 'Edit Address' : 'Add Address'}</h2>
                  <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['fullName', 'Full Name'],
                    ['phone', 'Mobile Number'],
                    ['alternativePhone', 'Alternative Phone'],
                    ['email', 'Email'],
                    ['state', 'Division'],
                    ['district', 'District'],
                    ['city', 'Upazila / Thana'],
                    ['area', 'Union / Area'],
                    ['postalCode', 'Post Code'],
                    ['addressLabel', 'Address Label'],
                    ['landmark', 'Landmark'],
                  ].map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                      <input
                        value={String(form[key as keyof AddressForm] ?? '')}
                        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        placeholder={
                          {
                            fullName: 'Enter name',
                            phone: 'Enter phone number',
                            alternativePhone: 'Enter phone number',
                            email: 'Enter email',
                            state: 'Enter state',
                            district: 'Enter district',
                            city: 'Enter city',
                            area: 'Enter area',
                            postalCode: 'Enter postal code',
                            addressLabel: 'Enter address label',
                            landmark: 'Enter landmark',
                          }[key] ?? ''
                        }
                        required={!['alternativePhone', 'email', 'area', 'postalCode', 'landmark'].includes(key)}
                      />
                    </label>
                  ))}
                  <label className="block md:col-span-2">
                    <span className="text-xs font-semibold text-muted-foreground">Road / Village / House No.</span>
                    <textarea
                      value={form.addressLine}
                      onChange={(event) => setForm((current) => ({ ...current, addressLine: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="Enter address"
                      rows={3}
                      required
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={form.isDefaultBilling}
                      onChange={(event) => setForm((current) => ({ ...current, isDefaultBilling: event.target.checked }))}
                    />
                    Default Billing
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={form.isDefaultShipping}
                      onChange={(event) => setForm((current) => ({ ...current, isDefaultShipping: event.target.checked }))}
                    />
                    Default Shipping
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    className="ml-auto px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Address'}
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <div className="py-16 text-center">
                <MapPin size={48} className="mx-auto mb-4 text-muted-foreground opacity-40" />
                <h3 className="mb-2 text-lg font-bold">No addresses found</h3>
                <p className="mb-6 text-sm text-muted-foreground">Add a billing or shipping address to use during checkout.</p>
                <button onClick={startAdd} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90">
                  <Plus size={16} /> Add Address
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`bg-card border rounded-2xl p-5 relative ${addr.isDefaultBilling || addr.isDefaultShipping ? 'border-primary' : 'border-border'}`}
                  >
                    {(addr.isDefaultBilling || addr.isDefaultShipping) && (
                      <span className="absolute top-4 right-4 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={10} /> Default
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin size={16} className="text-primary" />
                      <span className="font-bold text-sm">{addr.city || addr.district}</span>
                    </div>
                    <p className="text-sm font-medium">{addr.fullName}</p>
                    <p className="text-sm text-muted-foreground">{addr.addressLine}</p>
                    <p className="text-sm text-muted-foreground">
                      {[addr.area, addr.city, addr.district, addr.state, addr.postalCode].filter(Boolean).join(', ')}
                    </p>
                    <p className="text-sm text-muted-foreground">{addr.country}</p>
                    <p className="text-sm text-muted-foreground mt-1">{addr.phone}</p>

                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
                      <button
                        onClick={() => startEdit(addr)}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      {!addr.isDefaultBilling && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <button onClick={() => handleSetDefault(addr, 'billing')} className="text-xs font-medium text-primary hover:underline">
                            Default Billing
                          </button>
                        </>
                      )}
                      {!addr.isDefaultShipping && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <button onClick={() => handleSetDefault(addr, 'shipping')} className="text-xs font-medium text-primary hover:underline">
                            Default Shipping
                          </button>
                        </>
                      )}
                      <span className="text-muted-foreground">·</span>
                      <button
                        onClick={() => confirmDelete({ onConfirm: () => handleDelete(addr.id) })}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
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
