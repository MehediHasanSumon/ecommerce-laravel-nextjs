'use client';
import { useState, useEffect, useRef } from 'react';
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
import { hasPermission } from '@/lib/permissions';

const STEPS = ['Cart', 'Shipping', 'Payment'];

const emptyCheckoutForm = {
  fullName: '',
  email: '',
  phone: '',
  alternativePhone: '',
  address: '',
  city: '',
  state: '',
  district: '',
  area: '',
  zip: '',
  landmark: '',
  addressLabel: '',
  country: 'Bangladesh',
};

type CheckoutForm = typeof emptyCheckoutForm;
type ValidationErrors = Partial<Record<keyof CheckoutForm | 'shippingMethod' | 'paymentMethod', string>>;

const bangladeshPhonePattern = /^(?:\+?88)?01[3-9]\d{8}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const addressFieldOrder: Array<keyof CheckoutForm | 'shippingMethod' | 'paymentMethod'> = [
  'fullName',
  'phone',
  'address',
  'city',
  'state',
  'district',
  'zip',
  'shippingMethod',
  'paymentMethod',
];

function addressToCheckoutForm(address: CustomerAddress) {
  return {
    fullName: address.fullName,
    email: address.email ?? '',
    phone: address.phone,
    alternativePhone: address.alternativePhone ?? '',
    address: address.addressLine,
    city: address.city,
    state: address.state,
    district: address.district,
    area: address.area ?? '',
    zip: address.postalCode ?? '',
    landmark: address.landmark ?? '',
    addressLabel: address.addressLabel ?? '',
    country: address.country,
  };
}

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
  const [form, setForm] = useState(emptyCheckoutForm);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRenderedCheckoutContent, setHasRenderedCheckoutContent] = useState(false);
  const inputRefs = useRef<Partial<Record<keyof CheckoutForm, HTMLInputElement | null>>>({});
  const shippingMethodsRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const paymentStatus = searchParams.get('payment');
  const paymentOrderNumber = searchParams.get('order');
  const isPaymentRecovery = paymentStatus === 'failed' || paymentStatus === 'cancelled' || paymentStatus === 'cancel';
  const canCreateCheckout = hasPermission('can_create_checkout');
  const canApplyCoupon = hasPermission('can_apply_coupon');

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
  const subtotal = getSubtotal();

  useEffect(() => {
    setMounted(true);
    initializeCart().catch(() => undefined);
  }, [initializeCart]);

  useEffect(() => {
    if (mounted && cartInitialized) {
      setHasRenderedCheckoutContent(true);
    }
  }, [cartInitialized, mounted]);

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

  const selectedBillingAddress = addresses.find((address) => address.id === selectedBillingAddressId) ?? null;
  const selectedShippingCountry = selectedBillingAddress?.country || form.country || 'Bangladesh';

  useEffect(() => {
    const controller = new AbortController();
    setShippingLoading(true);

    fetchShippingMethods({ country: selectedShippingCountry, subtotal }, { signal: controller.signal })
      .then((methods) => {
        if (controller.signal.aborted) {
          return;
        }
        setShippingMethods(methods);
        setSelectedShippingMethodId((current) => methods.some((method) => method.id === current) ? current : methods[0]?.id || '');
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setShippingMethods([]);
          setSelectedShippingMethodId('');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setShippingLoading(false);
        }
      });

    return () => controller.abort();
  }, [selectedShippingCountry, subtotal]);

  useEffect(() => {
    let active = true;

    fetchAddresses()
      .then((savedAddresses) => {
        if (!active) {
          return;
        }
        setAddresses(savedAddresses);
        const defaultAddress =
          savedAddresses.find((address) => address.isDefaultShipping) ??
          savedAddresses.find((address) => address.isDefaultBilling) ??
          savedAddresses[0];
        if (defaultAddress) {
          setSelectedBillingAddressId(defaultAddress.id);
          setForm(addressToCheckoutForm(defaultAddress));
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedBillingAddress) {
      return;
    }

    setForm(addressToCheckoutForm(selectedBillingAddress));
  }, [selectedBillingAddress]);

  useEffect(() => {
    if (!cart.couponCode) {
      setCouponOpen(false);
      setCouponInput('');
    }
  }, [cart.couponCode]);

  if (!hasRenderedCheckoutContent) {
    return <CheckoutSkeleton />;
  }

  if (items.length === 0 && isPaymentRecovery) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-24 text-center">
          <CreditCard size={64} className="mx-auto text-muted-foreground opacity-30 mb-6" />
          <h1 className="text-2xl font-bold mb-4">
            {paymentStatus === 'cancelled' || paymentStatus === 'cancel' ? 'Payment cancelled' : 'Payment failed'}
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
            {paymentOrderNumber
              ? `Order ${paymentOrderNumber} was not completed. Review the order details or return to the shop to start a new checkout.`
              : 'Your payment was not completed. Return to the shop to start a new checkout.'}
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {paymentOrderNumber ? (
              <Link
                href={`/account/orders/${encodeURIComponent(paymentOrderNumber)}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90"
              >
                View Order Details
              </Link>
            ) : null}
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold transition-colors hover:bg-muted"
            >
              Continue Shopping
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
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

  const checkoutAddress = {
    fullName: form.fullName,
    email: form.email,
    phone: form.phone,
    alternativePhone: form.alternativePhone,
    addressLine: form.address,
    city: form.city,
    state: form.state,
    district: form.district || form.city,
    area: form.area,
    postalCode: form.zip,
    landmark: form.landmark,
    addressLabel: form.addressLabel,
    country: form.country,
  };

  const validateCheckout = (includePayment = false): ValidationErrors => {
    const nextErrors: ValidationErrors = {};
    const trimmed = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      alternativePhone: form.alternativePhone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      district: form.district.trim(),
      zip: form.zip.trim(),
      landmark: form.landmark.trim(),
      addressLabel: form.addressLabel.trim(),
      country: form.country.trim(),
    };

    if (!trimmed.fullName) {
      nextErrors.fullName = 'Full name is required.';
    } else if (trimmed.fullName.length < 2) {
      nextErrors.fullName = 'Full name must be at least 2 characters.';
    }

    if (trimmed.email && !emailPattern.test(trimmed.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!trimmed.phone) {
      nextErrors.phone = 'Mobile number is required.';
    } else if (!bangladeshPhonePattern.test(trimmed.phone)) {
      nextErrors.phone = 'Enter a valid Bangladeshi mobile number.';
    }

    if (trimmed.alternativePhone && !bangladeshPhonePattern.test(trimmed.alternativePhone)) {
      nextErrors.alternativePhone = 'Enter a valid Bangladeshi mobile number.';
    }

    if (!trimmed.address) {
      nextErrors.address = 'Address line is required.';
    } else if (trimmed.address.length < 5) {
      nextErrors.address = 'Address line must be at least 5 characters.';
    }

    if (!trimmed.city) {
      nextErrors.city = 'Upazila / Thana is required.';
    }

    if (!trimmed.state) {
      nextErrors.state = 'Division is required.';
    }

    if (!trimmed.district) {
      nextErrors.district = 'District is required.';
    }

    if (!trimmed.country) {
      nextErrors.country = 'Country is required.';
    }

    if (!selectedShippingMethodId) {
      nextErrors.shippingMethod = 'Select a shipping method.';
    }

    if (includePayment && !selectedPaymentMethod) {
      nextErrors.paymentMethod = 'Select a payment method.';
    }

    return nextErrors;
  };

  const focusFirstInvalidField = (errors: ValidationErrors) => {
    const firstKey = addressFieldOrder.find((key) => errors[key]);
    if (!firstKey) {
      return;
    }

    if (firstKey === 'shippingMethod') {
      shippingMethodsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (firstKey === 'paymentMethod') {
      return;
    }

    const input = inputRefs.current[firstKey];
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => input?.focus(), 250);
  };

  const handleContinueToPayment = async () => {
    const errors = validateCheckout(false);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      focusFirstInvalidField(errors);
      return;
    }

    setStep(2);
  };

  const handlePlaceOrder = async () => {
    if (!canCreateCheckout) return;
    const errors = validateCheckout(true);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      setStep(1);
      window.setTimeout(() => focusFirstInvalidField(errors), 0);
      return;
    }

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

  const updateForm = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setValidationErrors((errors) => {
      if (!(key in errors)) {
        return errors;
      }

      const nextErrors = { ...errors };
      delete nextErrors[key as keyof CheckoutForm];
      return nextErrors;
    });
  };
  const fieldClass =
    'w-full px-4 py-3 bg-background border border-border rounded-xl text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/15 disabled:bg-muted/50 disabled:text-muted-foreground disabled:opacity-100';
  const getFieldClass = (key: keyof CheckoutForm) =>
    validationErrors[key] ? `${fieldClass} border-destructive focus:border-destructive` : fieldClass;
  const selectedShippingMethod = shippingMethods.find((method) => method.id === selectedShippingMethodId) ?? null;
  const couponDiscount = cart.summary?.couponDiscount ?? cart.coupon?.discount ?? 0;
  const hasCoupon = Boolean(cart.couponCode);
  const shippingAmount = cart.coupon?.freeShipping ? 0 : (selectedShippingMethod?.charge ?? 0);
  const tax = getTax();
  const total = Math.max(0, subtotal - couponDiscount + shippingAmount + tax);
  const couponActionLabel = couponInput.trim().length > 0 ? 'Apply' : 'Cancel';
  const showShippingSkeleton = shippingLoading && shippingMethods.length === 0;
  const showPaymentSkeleton = paymentLoading && paymentMethods.length === 0;

  async function handleCouponApply() {
    if (!canApplyCoupon) return;

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
    if (!canApplyCoupon) return;

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

        {isPaymentRecovery ? (
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
                          onClick={() => {
                            setSelectedBillingAddressId(address.id);
                            setValidationErrors({});
                          }}
                          className={`w-full rounded-xl border p-3 text-left transition-colors ${
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/40 hover:bg-muted/50'
                          }`}
                        >
                          <input
                            type="radio"
                            checked={selected}
                            onChange={() => undefined}
                            className="sr-only"
                            tabIndex={-1}
                          />
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
                      onClick={() => {
                        setSelectedBillingAddressId('');
                        setForm(emptyCheckoutForm);
                        setValidationErrors({});
                      }}
                      className="text-left text-sm font-medium text-primary transition-colors hover:underline"
                    >
                      Add a new address
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name', key: 'fullName', placeholder: 'Enter name', col: 2 },
                    { label: 'Mobile Number', key: 'phone', placeholder: 'Enter phone number', type: 'tel' },
                    { label: 'Alternative Phone', key: 'alternativePhone', placeholder: 'Enter phone number', type: 'tel' },
                    {
                      label: 'Email',
                      key: 'email',
                      placeholder: 'Enter email',
                      type: 'email',
                    },
                    { label: 'Division', key: 'state', placeholder: 'Enter state' },
                    { label: 'District', key: 'district', placeholder: 'Enter district' },
                    { label: 'Upazila / Thana', key: 'city', placeholder: 'Enter city' },
                    { label: 'Union / Area', key: 'area', placeholder: 'Enter area' },
                    { label: 'Post Code', key: 'zip', placeholder: 'Enter postal code' },
                    { label: 'Address Label', key: 'addressLabel', placeholder: 'Enter address label' },
                    { label: 'Road / Village / House No.', key: 'address', placeholder: 'Enter address', col: 2 },
                    { label: 'Landmark', key: 'landmark', placeholder: 'Enter landmark', col: 2 },
                  ].map(({ label, key, placeholder, col, type }) => (
                    <div key={key} className={col === 2 ? 'md:col-span-2' : ''}>
                      <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">
                        {label}
                      </label>
                      <input
                        ref={(element) => {
                          inputRefs.current[key as keyof CheckoutForm] = element;
                        }}
                        type={type ?? 'text'}
                        value={form[key as keyof typeof form]}
                        onChange={(e) => updateForm(key, e.target.value)}
                        placeholder={placeholder}
                        className={getFieldClass(key as keyof CheckoutForm)}
                        disabled={Boolean(selectedBillingAddress)}
                        aria-invalid={Boolean(validationErrors[key as keyof CheckoutForm])}
                        aria-describedby={validationErrors[key as keyof CheckoutForm] ? `checkout-${key}-error` : undefined}
                      />
                      {validationErrors[key as keyof CheckoutForm] ? (
                        <p id={`checkout-${key}-error`} className="mt-1.5 text-xs text-destructive">
                          {validationErrors[key as keyof CheckoutForm]}
                        </p>
                      ) : null}
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
                  onClick={() => void handleContinueToPayment()}
                  disabled={isSubmitting}
                  className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
                >
                  {isSubmitting ? 'Saving address...' : <>Continue to Payment <ChevronRight size={16} /></>}
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
                  {showPaymentSkeleton ? (
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
                    disabled={!canCreateCheckout || isSubmitting || paymentMethods.length === 0}
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
              <div ref={shippingMethodsRef} className="bg-card border border-border rounded-2xl p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Truck size={16} className="text-primary" />
                  <h2 className="font-bold">Shipping Method</h2>
                </div>

                {showShippingSkeleton ? (
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
                          onClick={() => {
                            setSelectedShippingMethodId(method.id);
                            setValidationErrors((errors) => {
                              if (!errors.shippingMethod) {
                                return errors;
                              }

                              const nextErrors = { ...errors };
                              delete nextErrors.shippingMethod;
                              return nextErrors;
                            });
                          }}
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
                    {validationErrors.shippingMethod ? (
                      <p className="text-xs text-destructive">{validationErrors.shippingMethod}</p>
                    ) : null}
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
                  {!hasCoupon && canApplyCoupon && couponOpen ? (
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
                  ) : !hasCoupon && canApplyCoupon ? (
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
                {hasCoupon && canApplyCoupon ? (
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

