'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, CreditCard, MapPin, Check, Lock, ShoppingBag, Truck } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useCartStore } from '@/store/cartStore';
import { selectCurrencyFingerprint, useSettingsStore } from '@/store/settings-store';
import { formatPrice } from '@/utils/format';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { fetchShippingMethods, type ShippingMethod } from '@/services/catalog-service';
import {
  fetchAddresses,
  fetchPaymentMethods,
  placeOrder,
  type CustomerAddress,
  type PaymentMethod,
} from '@/services/checkout-service';
import { toAppError } from '@/lib/errors';
import { toast } from 'sonner';

const STEPS = ['Cart', 'Shipping', 'Payment'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${i < current ? 'bg-emerald-500 text-white' : i === current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {i < current ? <Check size={14} /> : i + 1}
          </div>
          <span
            className={`hidden md:block mx-2 text-xs font-medium ${i === current ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            {step}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={`w-8 md:w-16 h-0.5 mx-1 ${i < current ? 'bg-emerald-500' : 'bg-muted'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 pb-16">
        <div className="mb-6 h-5 w-40 rounded bg-muted animate-pulse" />
        <div className="mb-8 flex items-center justify-center gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="hidden h-4 w-16 rounded bg-muted animate-pulse md:block" />
              {index < 2 && <div className="h-0.5 w-10 rounded bg-muted animate-pulse md:w-16" />}
            </div>
          ))}
        </div>
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <div className="h-[28rem] rounded-2xl bg-muted animate-pulse" />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <div className="h-44 rounded-2xl bg-muted animate-pulse" />
            <div className="h-72 rounded-2xl bg-muted animate-pulse" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  useSettingsStore(selectCurrencyFingerprint);
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [shippingLoading, setShippingLoading] = useState(true);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string>('');
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState<string>('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    district: '',
    area: '',
    zip: '',
    country: 'Bangladesh',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const paymentStatus = searchParams.get('payment');
  const paymentOrderNumber = searchParams.get('order');

  const items = useCartStore((s) => s.items);
  const cart = useCartStore((s) => s.cart);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getTax = useCartStore((s) => s.getTax);
  const initializeCart = useCartStore((s) => s.initialize);
  const cartInitialized = useCartStore((s) => s.initialized);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);
  const couponMessage = useCartStore((s) => s.couponMessage);
  const couponMessageType = useCartStore((s) => s.couponMessageType);
  const couponLoading = useCartStore((s) => s.isCouponLoading);

  useEffect(() => {
    setMounted(true);
    initializeCart().catch(() => undefined);
  }, [initializeCart]);

  useEffect(() => {
    const controller = new AbortController();
    setShippingLoading(true);

    fetchShippingMethods({ signal: controller.signal })
      .then((methods) => {
        setShippingMethods(methods);
        setSelectedShippingMethodId((current) => current || methods[0]?.id || '');
      })
      .catch(() => {
        setShippingMethods([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setShippingLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    let active = true;
    setPaymentLoading(true);

    fetchPaymentMethods()
      .then((methods) => {
        if (!active) {
          return;
        }
        setPaymentMethods(methods);
        setSelectedPaymentMethod((current) => current || methods[0]?.gateway || '');
      })
      .catch(() => {
        if (active) {
          setPaymentMethods([]);
        }
      })
      .finally(() => {
        if (active) {
          setPaymentLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetchAddresses()
      .then((savedAddresses) => {
        if (!active) {
          return;
        }
        setAddresses(savedAddresses);
        const defaultAddress = savedAddresses.find((address) => address.isDefaultBilling) ?? savedAddresses[0];
        if (defaultAddress) {
          setSelectedBillingAddressId(defaultAddress.id);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!cart.couponCode) {
      setCouponOpen(false);
      setCouponInput('');
    }
  }, [cart.couponCode]);

  if (!mounted || !cartInitialized) {
    return <CheckoutSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-24 text-center">
          <ShoppingBag size={64} className="mx-auto text-muted-foreground opacity-30 mb-6" />
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">Add items to your cart before checking out.</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90"
          >
            Continue Shopping
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const selectedBillingAddress = addresses.find((address) => address.id === selectedBillingAddressId) ?? null;
  const checkoutAddress = {
    fullName: form.fullName,
    email: form.email,
    phone: form.phone,
    addressLine: form.address,
    city: form.city,
    state: form.state,
    district: form.district || form.city,
    area: form.area,
    postalCode: form.zip,
    country: form.country,
  };

  const handlePlaceOrder = async () => {
    if (!selectedShippingMethodId || !selectedPaymentMethod) {
      toast.error('Please select shipping and payment methods.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await placeOrder({
        billing_address_id: selectedBillingAddress ? Number(selectedBillingAddress.id) : undefined,
        billing_address: selectedBillingAddress ? undefined : checkoutAddress,
        same_as_billing: sameAsBilling,
        shipping_method_id: Number(selectedShippingMethodId),
        payment_method: selectedPaymentMethod,
      });

      if (response.payment.redirectUrl) {
        window.location.assign(response.payment.redirectUrl);
        return;
      }

      router.push(`/payment/success?payment=paid&order=${encodeURIComponent(response.order.orderNumber)}`);
    } catch (error) {
      toast.error(toAppError(error).message || 'Unable to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateForm = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const fieldClass =
    'w-full px-4 py-3 bg-muted border border-transparent rounded-xl text-sm focus:border-primary focus:bg-background outline-none transition-colors';
  const selectedShippingMethod = shippingMethods.find((method) => method.id === selectedShippingMethodId) ?? null;
  const couponDiscount = cart.summary?.couponDiscount ?? cart.coupon?.discount ?? 0;
  const hasCoupon = Boolean(cart.couponCode);
  const shippingAmount = cart.coupon?.freeShipping ? 0 : (selectedShippingMethod?.charge ?? 0);
  const subtotal = getSubtotal();
  const tax = getTax();
  const total = Math.max(0, subtotal - couponDiscount + shippingAmount + tax);
  const couponActionLabel = couponInput.trim().length > 0 ? 'Apply' : 'Cancel';

  async function handleCouponApply() {
    if (!couponInput.trim()) {
      setCouponInput('');
      setCouponOpen(false);
      return;
    }

    const applied = await applyCoupon(couponInput);
    if (applied) {
      setCouponOpen(false);
    }
  }

  async function handleCouponAction() {
    if (couponInput.trim().length > 0) {
      await handleCouponApply();
      return;
    }

    setCouponInput('');
    setCouponOpen(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/cart" className="hover:text-foreground">
            Cart
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Checkout</span>
        </nav>

        <StepIndicator current={step} />

        {paymentStatus === 'failed' || paymentStatus === 'cancelled' || paymentStatus === 'cancel' ? (
          <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-destructive">
                  {paymentStatus === 'cancelled' || paymentStatus === 'cancel' ? 'Payment cancelled' : 'Payment failed'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {paymentOrderNumber
                    ? `Order ${paymentOrderNumber} was not paid. Please choose a payment method and try again.`
                    : 'Your payment was not completed. Please choose a payment method and try again.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.replace('/checkout')}
                className="w-fit rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
              >
                Retry Payment
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3">
            {step === 1 && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <MapPin size={18} className="text-primary" />
                  <h2 className="font-bold">Shipping Information</h2>
                </div>
                {addresses.length > 0 && (
                  <div className="mb-5 space-y-2">
                    {addresses.map((address) => {
                      const selected = selectedBillingAddressId === address.id;

                      return (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => setSelectedBillingAddressId(address.id)}
                          className={`w-full rounded-xl border p-3 text-left transition-colors ${
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/40 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{address.fullName}</p>
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {address.addressLine}, {address.city}, {address.state}
                              </p>
                            </div>
                            {selected && <Check size={16} className="text-primary" />}
                          </div>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSelectedBillingAddressId('')}
                      className="text-left text-sm font-medium text-primary transition-colors hover:underline"
                    >
                      Add a new address
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name', key: 'fullName', placeholder: 'Enter full name', col: 2 },
                    {
                      label: 'Email',
                      key: 'email',
                      placeholder: 'Enter email address',
                      type: 'email',
                    },
                    { label: 'Phone', key: 'phone', placeholder: 'Enter phone number', type: 'tel' },
                    { label: 'Street Address', key: 'address', placeholder: 'Enter street address', col: 2 },
                    { label: 'City', key: 'city', placeholder: 'Enter city' },
                    { label: 'State', key: 'state', placeholder: 'Enter state' },
                    { label: 'District', key: 'district', placeholder: 'Enter district' },
                    { label: 'Area / Zone', key: 'area', placeholder: 'Enter area or zone' },
                    { label: 'ZIP Code', key: 'zip', placeholder: 'Enter ZIP code' },
                    { label: 'Country', key: 'country', placeholder: 'Enter country' },
                  ].map(({ label, key, placeholder, col, type }) => (
                    <div key={key} className={col === 2 ? 'md:col-span-2' : ''}>
                      <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">
                        {label}
                      </label>
                      <input
                        type={type ?? 'text'}
                        value={form[key as keyof typeof form]}
                        onChange={(e) => updateForm(key, e.target.value)}
                        placeholder={placeholder}
                        className={fieldClass}
                        disabled={Boolean(selectedBillingAddress)}
                      />
                    </div>
                  ))}
                </div>
                <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={sameAsBilling}
                    onChange={(event) => setSameAsBilling(event.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Shipping address same as billing address
                </label>
                <button
                  onClick={() => setStep(2)}
                  className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
                >
                  Continue to Payment <ChevronRight size={16} />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard size={18} className="text-primary" />
                  <h2 className="font-bold">Payment Details</h2>
                  <Lock size={14} className="text-muted-foreground ml-auto" />
                  <span className="text-xs text-muted-foreground">Encrypted & secure</span>
                </div>
                <div className="space-y-4">
                  {paymentLoading ? (
                    <div className="space-y-2">
                      <div className="h-14 rounded-xl bg-muted animate-pulse" />
                      <div className="h-14 rounded-xl bg-muted animate-pulse" />
                    </div>
                  ) : paymentMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payment methods available right now.</p>
                  ) : (
                    paymentMethods.map((method) => {
                      const selected = method.gateway === selectedPaymentMethod;

                      return (
                        <button
                          key={method.gateway}
                          type="button"
                          onClick={() => setSelectedPaymentMethod(method.gateway)}
                          className={`w-full rounded-xl border p-3 text-left transition-colors ${
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/40 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{method.name}</p>
                              {method.description && (
                                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                  {method.description}
                                </p>
                              )}
                            </div>
                            {selected && <Check size={16} className="text-primary" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3.5 border border-border rounded-xl font-semibold hover:bg-muted transition-colors text-sm"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting || paymentMethods.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity text-sm"
                  >
                    {isSubmitting ? 'Placing order...' : <>Place Order <ChevronRight size={16} /></>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Truck size={16} className="text-primary" />
                  <h2 className="font-bold">Shipping Method</h2>
                </div>

                {shippingLoading ? (
                  <div className="space-y-2">
                    <div className="h-12 rounded-xl bg-muted animate-pulse" />
                    <div className="h-12 rounded-xl bg-muted animate-pulse" />
                  </div>
                ) : shippingMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shipping methods available right now.</p>
                ) : (
                  <div className="space-y-2">
                    {shippingMethods.map((method) => {
                      const selected = method.id === selectedShippingMethodId;

                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedShippingMethodId(method.id)}
                          className={`w-full rounded-xl border p-3 text-left transition-colors ${
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/40 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{method.name}</p>
                              {(method.deliveryType || method.estimatedDeliveryTime) && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                  {[method.estimatedDeliveryTime].filter(Boolean).join(' • ')}
                              </p>
                              )}
                              {method.description && (
                                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                  {method.description}
                                </p>
                              )}
                            </div>
                            <span className="shrink-0 text-sm font-bold">
                              {method.charge === 0 ? 'FREE' : formatPrice(method.charge)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-bold mb-5">Order Summary</h2>
                <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                        <Image
                          src={item.selectedImage ?? item.product.thumbnail}
                          alt={item.product.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                          {item.quantity}
                        </span>
                      </div>
                      <p className="text-xs flex-1 truncate">{item.product.name}</p>
                      <span className="text-xs font-semibold">
                        {formatPrice((item.subtotal ?? item.product.price * item.quantity))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-sm border-t border-border pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{shippingAmount === 0 ? <span className="text-emerald-600">FREE</span> : formatPrice(shippingAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                  {!hasCoupon && couponOpen ? (
                    <div className="space-y-2 py-1">
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                        <input
                          value={couponInput}
                          onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void handleCouponApply();
                            }
                          }}
                          placeholder="Enter coupon code"
                          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <button
                          type="button"
                          disabled={couponLoading}
                          onClick={() => void handleCouponAction()}
                          className="shrink-0 text-sm font-medium text-primary transition-colors hover:underline disabled:opacity-50"
                        >
                          {couponLoading ? 'Applying...' : couponActionLabel}
                        </button>
                      </div>
                      {couponMessage ? (
                        <p className={couponMessageType === 'error' ? 'text-xs text-destructive' : 'text-xs text-emerald-600'}>
                          {couponMessage}
                        </p>
                      ) : null}
                    </div>
                  ) : !hasCoupon ? (
                    <button
                      type="button"
                      onClick={() => setCouponOpen(true)}
                      className="text-left text-sm font-medium text-primary transition-colors hover:underline"
                    >
                      Have a coupon?
                    </button>
                  ) : null}
                  {hasCoupon && couponDiscount > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-emerald-600">-{formatPrice(couponDiscount)}</span>
                    </div>
                  ) : null}
                  {hasCoupon && couponMessage ? (
                    <p className={couponMessageType === 'error' ? 'text-xs text-destructive' : 'text-xs text-emerald-600'}>
                      {couponMessage}
                    </p>
                  ) : null}
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
                {hasCoupon ? (
                  <button
                    type="button"
                    disabled={couponLoading}
                    onClick={() => void removeCoupon()}
                    className="mt-3 text-sm font-medium text-primary transition-colors hover:underline disabled:opacity-50"
                  >
                    {couponLoading ? 'Removing...' : 'Remove Coupon'}
                  </button>
                ) : null}
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock size={12} /> <span>Secured by 256-bit SSL encryption</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

