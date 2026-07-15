"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { orderManagementService, type CreateOrderOptions, type CreateOrderProduct } from "@/features/admin/orders/services/order-management-service";
import { toAppError } from "@/lib/errors";
import { formatPrice } from "@/utils/format";
import { useRouter } from "next/navigation";

type Address = Record<string, string>;
type DraftItem = { key: string; product_id: string; product_variant_id: string; quantity: string; unit_price: string; discount: string };
const emptyAddress = (): Address => ({ full_name: "", phone: "", email: "", country: "Bangladesh", state: "", district: "", city: "", area: "", postal_code: "", address_line: "" });

export function AdminOrderCreateContent() {
  const router = useRouter();
  const [options, setOptions] = useState<CreateOrderOptions | null>(null);
  const [customerType, setCustomerType] = useState("new_guest");
  const [customerId, setCustomerId] = useState("");
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [billing, setBilling] = useState<Address>(emptyAddress());
  const [shipping, setShipping] = useState<Address>(emptyAddress());
  const [sameAddress, setSameAddress] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [shippingMethodId, setShippingMethodId] = useState("");
  const [shippingCharge, setShippingCharge] = useState("");
  const [tax, setTax] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState("");
  const [additionalDiscount, setAdditionalDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [orderStatus, setOrderStatus] = useState("pending");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void orderManagementService.createOptions().then((response) => {
      setOptions(response.data);
      setPaymentMethod(response.data.payment_methods[0]?.gateway ?? "cash_on_delivery");
      setOrderStatus(response.data.statuses.order[0] ?? "pending");
    }).catch((error) => toast.error(toAppError(error).message));
  }, []);

  useEffect(() => {
    if (sameAddress) setShipping({ ...billing });
  }, [billing, sameAddress]);

  const selectedCustomer = useMemo(() => {
    if (!options || !customerId) return null;
    if (customerType === "registered") return options.registered_customers.find((item) => String(item.id) === customerId) ?? null;
    return options.guest_customers.find((item) => String(item.id) === customerId) ?? null;
  }, [customerId, customerType, options]);

  useEffect(() => {
    if (!selectedCustomer) return;
    setCustomer({ name: selectedCustomer.name, email: selectedCustomer.email ?? "", phone: selectedCustomer.phone ?? "" });
    if ("billing_address" in selectedCustomer) {
      setBilling(addressFrom(selectedCustomer.billing_address));
      setShipping(addressFrom(selectedCustomer.shipping_address));
    }
  }, [selectedCustomer]);

  const subtotal = items.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0);
  const itemDiscount = items.reduce((sum, item) => sum + Number(item.discount || 0), 0);
  const total = Math.max(0, subtotal - itemDiscount - Number(couponDiscount || 0) - Number(additionalDiscount || 0) + Number(shippingCharge || 0) + Number(tax || 0));

  function addItem() {
    const product = options?.products[0];
    if (!product) return;
    setItems((current) => [...current, { key: crypto.randomUUID(), product_id: String(product.id), product_variant_id: "", quantity: "1", unit_price: String(product.price), discount: "" }]);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  function selectProduct(item: DraftItem, productId: string) {
    const product = options?.products.find((entry) => String(entry.id) === productId);
    updateItem(item.key, { product_id: productId, product_variant_id: "", unit_price: String(product?.price ?? 0) });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!options || !items.length) { toast.error("Add at least one product."); return; }
    setSaving(true);
    try {
      const response = await orderManagementService.create({
        customer_type: customerType,
        user_id: customerType === "registered" ? Number(customerId) : undefined,
        guest_customer_id: customerType === "guest" ? Number(customerId) : undefined,
        customer,
        billing_address: billing,
        shipping_address: shipping,
        items: items.map((item) => ({ product_id: Number(item.product_id), product_variant_id: item.product_variant_id ? Number(item.product_variant_id) : null, quantity: Number(item.quantity), unit_price: Number(item.unit_price || 0), discount: Number(item.discount || 0) })),
        shipping_method_id: shippingMethodId ? Number(shippingMethodId) : null,
        shipping_charge: Number(shippingCharge || 0),
        tax: Number(tax || 0),
        coupon_code: couponCode || null,
        coupon_discount: Number(couponDiscount || 0),
        additional_discount: Number(additionalDiscount || 0),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        status: orderStatus,
        delivery_notes: deliveryNotes || null,
        admin_notes: adminNotes || null,
        customer_notes: customerNotes || null,
      });
      toast.success("Order created successfully.");
      router.push(`/admin/orders/${response.data.order.orderNumber}`);
    } catch (error) { toast.error(toAppError(error).message); } finally { setSaving(false); }
  }

  if (!options) return <div className="h-64 animate-pulse rounded-lg bg-muted" />;

  return <form onSubmit={submit} className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Orders</Link><h1 className="mt-3 text-2xl font-extrabold">Create Order</h1><p className="mt-1 text-sm text-muted-foreground">Create a phone or admin order using the shared checkout workflow.</p></div><Button type="submit" isLoading={saving} icon={<Save className="h-4 w-4" />}>Create Order</Button></div>
    <Panel title="Customer"><div className="grid gap-3 md:grid-cols-3"><FieldSelect label="Customer Type" value={customerType} values={[["new_guest", "New Guest"], ["registered", "Registered Customer"], ["guest", "Existing Guest"]]} onChange={(value) => { setCustomerType(value); setCustomerId(""); }} /><FieldSelect label="Select Customer" value={customerId} disabled={customerType === "new_guest"} values={(customerType === "registered" ? options.registered_customers : options.guest_customers).map((item) => [String(item.id), `${item.name} · ${item.phone ?? item.email ?? ""}`])} onChange={setCustomerId} placeholder={customerType === "new_guest" ? "New guest details below" : "Select customer"} /><Input label="Name" required value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} /></div><div className="mt-3 grid gap-3 md:grid-cols-2"><Input label="Email" type="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} /><Input label="Phone" required value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} /></div></Panel>
    <div className="grid gap-4 lg:grid-cols-2"><AddressForm title="Billing Address" value={billing} onChange={setBilling} /><div><AddressForm title="Shipping Address" value={shipping} onChange={setShipping} /><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={sameAddress} onChange={(event) => setSameAddress(event.target.checked)} /> Use billing address for shipping</label></div></div>
    <Panel title="Products"><div className="space-y-3">{items.map((item) => <OrderItemRow key={item.key} item={item} products={options.products} onProduct={selectProduct} onChange={updateItem} onRemove={(key) => setItems((current) => current.filter((entry) => entry.key !== key))} />)}</div><Button type="button" size="sm" variant="secondary" className="mt-4" icon={<Plus className="h-4 w-4" />} onClick={addItem}>Add Product</Button></Panel>
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]"><Panel title="Order Information"><div className="grid gap-3 md:grid-cols-2"><FieldSelect label="Shipping Method" value={shippingMethodId} values={options.shipping_methods.map((item) => [String(item.id), `${item.name} · ${formatPrice(item.rate)}`])} onChange={(value) => { setShippingMethodId(value); const method = options.shipping_methods.find((item) => String(item.id) === value); setShippingCharge(String(method?.rate ?? 0)); }} placeholder="No shipping method" /><Input label="Shipping Charge" type="number" min="0" step="0.01" value={shippingCharge} onChange={(event) => setShippingCharge(event.target.value)} /><Input label="Tax" type="number" min="0" step="0.01" value={tax} onChange={(event) => setTax(event.target.value)} /><Input label="Coupon Code" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} /><Input label="Coupon Discount" type="number" min="0" step="0.01" value={couponDiscount} onChange={(event) => setCouponDiscount(event.target.value)} /><Input label="Additional Discount" type="number" min="0" step="0.01" value={additionalDiscount} onChange={(event) => setAdditionalDiscount(event.target.value)} /><FieldSelect label="Payment Method" value={paymentMethod} values={options.payment_methods.map((item) => [item.gateway, item.name])} onChange={setPaymentMethod} /><FieldSelect label="Payment Status" value={paymentStatus} values={options.statuses.payment.map((item) => [item, label(item)])} onChange={setPaymentStatus} /><FieldSelect label="Order Status" value={orderStatus} values={options.statuses.order.map((item) => [item, label(item)])} onChange={setOrderStatus} /></div><div className="mt-3 grid gap-3 md:grid-cols-3"><TextArea label="Customer Notes" value={customerNotes} onChange={setCustomerNotes} /><TextArea label="Delivery Notes" value={deliveryNotes} onChange={setDeliveryNotes} /><TextArea label="Internal Admin Notes" value={adminNotes} onChange={setAdminNotes} /></div></Panel><Panel title="Order Summary"><Summary label="Subtotal" value={subtotal} /><Summary label="Item Discount" value={-itemDiscount} /><Summary label="Coupon Discount" value={-Number(couponDiscount || 0)} /><Summary label="Additional Discount" value={-Number(additionalDiscount || 0)} /><Summary label="Shipping" value={Number(shippingCharge || 0)} /><Summary label="Tax" value={Number(tax || 0)} strong /><Summary label="Grand Total" value={total} strong /></Panel></div>
  </form>;
}

function addressFrom(address: Record<string, string | null> | null): Address { return { ...emptyAddress(), ...(address ?? {}) } as Address; }
function label(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-lg border border-border bg-card p-5"><h2 className="mb-4 font-bold">{title}</h2>{children}</section>; }
function FieldSelect({ label: title, value, values, onChange, disabled, placeholder = "Select" }: { label: string; value: string; values: string[][]; onChange: (value: string) => void; disabled?: boolean; placeholder?: string }) { return <label className="block space-y-2 text-sm font-semibold"><span>{title}</span><Select value={value || "none"} disabled={disabled} onValueChange={(next) => onChange(next === "none" ? "" : next)}><SelectTrigger className="h-11 rounded-lg"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent><SelectItem value="none">{placeholder}</SelectItem>{values.map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select></label>; }
function AddressForm({ title, value, onChange }: { title: string; value: Address; onChange: (value: Address) => void }) { const set = (key: string, next: string) => onChange({ ...value, [key]: next }); return <Panel title={title}><div className="grid gap-3 sm:grid-cols-2">{Object.entries(value).map(([key, current]) => <Input key={key} label={key.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase())} required={["full_name", "phone", "country", "state", "district", "city", "address_line"].includes(key)} value={current} onChange={(event) => set(key, event.target.value)} />)}</div></Panel>; }
function OrderItemRow({ item, products, onProduct, onChange, onRemove }: { item: DraftItem; products: CreateOrderProduct[]; onProduct: (item: DraftItem, productId: string) => void; onChange: (key: string, patch: Partial<DraftItem>) => void; onRemove: (key: string) => void }) { const product = products.find((entry) => String(entry.id) === item.product_id); return <div className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1.5fr_1fr_90px_110px_110px_auto] md:items-end"><FieldSelect label="Product" value={item.product_id} values={products.map((entry) => [String(entry.id), entry.name])} onChange={(value) => onProduct(item, value)} /><FieldSelect label="Variant" value={item.product_variant_id} values={(product?.variants ?? []).map((entry) => [String(entry.id), `${entry.label} · ${formatPrice(entry.price)}`])} onChange={(value) => { const variant = product?.variants.find((entry) => String(entry.id) === value); onChange(item.key, { product_variant_id: value, unit_price: String(variant?.price ?? product?.price ?? 0) }); }} placeholder="Default" /><Input label="Qty" type="number" min="1" value={item.quantity} onChange={(event) => onChange(item.key, { quantity: event.target.value })} /><Input label="Unit Price" type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => onChange(item.key, { unit_price: event.target.value })} /><Input label="Discount" type="number" min="0" step="0.01" value={item.discount} onChange={(event) => onChange(item.key, { discount: event.target.value })} /><Button type="button" size="icon" variant="ghost" icon={<Trash2 className="h-4 w-4" />} aria-label="Remove product" onClick={() => onRemove(item.key)} /></div>; }
function TextArea({ label: title, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block space-y-2 text-sm font-semibold"><span>{title}</span><textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-transparent bg-muted px-3 py-2 text-sm outline-none focus:border-primary focus:bg-background" /></label>; }
function Summary({ label: title, value, strong }: { label: string; value: number; strong?: boolean }) { return <div className={`flex justify-between py-1 ${strong ? "border-t border-border pt-3 font-bold" : "text-sm"}`}><span>{title}</span><span>{formatPrice(value)}</span></div>; }
