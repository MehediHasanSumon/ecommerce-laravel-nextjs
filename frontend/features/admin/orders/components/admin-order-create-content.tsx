"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FraudCheckModal } from "@/features/admin/fraud/components/fraud-check-modal";
import {
  orderManagementService,
  type CreateOrderOptions,
  type CreateOrderProduct,
} from "@/features/admin/orders/services/order-management-service";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { formatPrice } from "@/utils/format";

type Address = Record<string, string>;
type DraftItem = {
  key: string;
  product: CreateOrderProduct | null;
  product_variant_id: string;
  quantity: string;
  unit_price: string;
  discount: string;
};
type Customer = { name: string; email: string; phone: string };

const emptyAddress = (): Address => ({
  full_name: "",
  phone: "",
  email: "",
  country: "Bangladesh",
  state: "",
  district: "",
  city: "",
  area: "",
  postal_code: "",
  address_line: "",
});
const emptyItem = (): DraftItem => ({
  key: crypto.randomUUID(),
  product: null,
  product_variant_id: "",
  quantity: "1",
  unit_price: "",
  discount: "",
});

export function AdminOrderCreateContent() {
  return <AdminOrderForm />;
}

export function AdminOrderEditContent({ orderNumber }: { orderNumber: string }) {
  return <AdminOrderForm orderNumber={orderNumber} />;
}

function AdminOrderForm({ orderNumber }: { orderNumber?: string }) {
  const router = useRouter();
  const editing = Boolean(orderNumber);
  const [options, setOptions] = useState<CreateOrderOptions | null>(null);
  const [customerType, setCustomerType] = useState("new_guest");
  const [customerId, setCustomerId] = useState("");
  const [customer, setCustomer] = useState<Customer>({ name: "", email: "", phone: "" });
  const [billing, setBilling] = useState<Address>(emptyAddress());
  const [shipping, setShipping] = useState<Address>(emptyAddress());
  const [sameAddress, setSameAddress] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fraudModalOpen, setFraudModalOpen] = useState(false);
  useAuthStore((state) => state.user?.permissions);
  const canCheckFraud = hasPermission("can_create_fraud_check");

  useEffect(() => {
    let active = true;
    void Promise.all([
      orderManagementService.createOptions(),
      orderNumber ? orderManagementService.show(orderNumber) : Promise.resolve(null),
    ])
      .then(async ([optionResponse, orderResponse]) => {
        if (!active) return;
        setOptions(optionResponse.data);
        setPaymentMethod(
          optionResponse.data.payment_methods[0]?.gateway ?? "cash_on_delivery",
        );
        setOrderStatus(optionResponse.data.statuses.order[0] ?? "pending");
        if (!orderResponse) return;

        const order = orderResponse.data.order;
        const productResponse = await orderManagementService.searchProducts(
          "",
          order.items.map((item) => Number(item.productId)).filter(Boolean),
        );
        const products = productResponse.data.products;
        if (!active) return;
        setCustomerType(
          order.userId ? "registered" : order.guestCustomerId ? "guest" : "new_guest",
        );
        setCustomerId(String(order.userId ?? order.guestCustomerId ?? ""));
        setCustomer({
          name: order.customer.name ?? "",
          email: order.customer.email ?? "",
          phone: order.customer.phone ?? "",
        });
        setBilling(addressFrom(order.billingAddress));
        setShipping(addressFrom(order.shippingAddress));
        setItems(
          order.items.map((item) => ({
            key: crypto.randomUUID(),
            product:
              products.find((product) => product.id === Number(item.productId)) ?? null,
            product_variant_id: item.variantId ? String(item.variantId) : "",
            quantity: String(item.quantity),
            unit_price: String(item.unitPrice),
            discount: String(item.lineDiscount || ""),
          })),
        );
        setShippingMethodId(String(order.shippingMethodId ?? ""));
        setShippingCharge(String(order.summary.shipping));
        setTax(String(order.summary.tax));
        setCouponCode(order.couponCode ?? "");
        setAdditionalDiscount(String(order.additionalDiscount || ""));
        setCouponDiscount(
          String(
            Math.max(
              0,
              order.summary.couponDiscount - Number(order.additionalDiscount || 0),
            ) || "",
          ),
        );
        setPaymentMethod(order.paymentMethod);
        setPaymentStatus(order.paymentStatus);
        setOrderStatus(order.status);
        setDeliveryNotes(order.deliveryNotes ?? "");
        setAdminNotes(order.adminNotes ?? "");
        setCustomerNotes(order.customerNotes ?? "");
      })
      .catch((error) => toast.error(toAppError(error).message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [orderNumber]);

  useEffect(() => {
    if (sameAddress) setShipping({ ...billing });
  }, [billing, sameAddress]);

  const selectedCustomer = useMemo(() => {
    if (!options || !customerId) return null;
    return customerType === "registered"
      ? options.registered_customers.find((item) => String(item.id) === customerId)
      : options.guest_customers.find((item) => String(item.id) === customerId);
  }, [customerId, customerType, options]);

  useEffect(() => {
    if (!selectedCustomer) return;
    setCustomer({
      name: selectedCustomer.name,
      email: selectedCustomer.email ?? "",
      phone: selectedCustomer.phone ?? "",
    });
    if ("billing_address" in selectedCustomer) {
      setBilling(addressFrom(selectedCustomer.billing_address));
      setShipping(addressFrom(selectedCustomer.shipping_address));
    }
  }, [selectedCustomer]);

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0),
    0,
  );
  const itemDiscount = items.reduce((sum, item) => sum + Number(item.discount || 0), 0);
  const total = Math.max(
    0,
    subtotal -
      itemDiscount -
      Number(couponDiscount || 0) -
      Number(additionalDiscount || 0) +
      Number(shippingCharge || 0) +
      Number(tax || 0),
  );

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (items.some((item) => !item.product)) {
      toast.error("Select a product for every row.");
      return;
    }
    setSaving(true);
    const payload = {
      customer_type: customerType,
      user_id: customerType === "registered" ? Number(customerId) : undefined,
      guest_customer_id: customerType === "guest" ? Number(customerId) : undefined,
      customer,
      billing_address: billing,
      shipping_address: shipping,
      items: items.map((item) => ({
        product_id: item.product?.id,
        product_variant_id: item.product_variant_id
          ? Number(item.product_variant_id)
          : null,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price || 0),
        discount: Number(item.discount || 0),
      })),
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
    };
    try {
      const response =
        editing && orderNumber
          ? await orderManagementService.fullUpdate(orderNumber, payload)
          : await orderManagementService.create(payload);
      toast.success(
        editing ? "Order updated successfully." : "Order created successfully.",
      );
      router.push(`/admin/orders/${encodeURIComponent(response.data.order.orderNumber)}`);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !options)
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />;

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={
              editing && orderNumber
                ? `/admin/orders/${encodeURIComponent(orderNumber)}`
                : "/admin/orders"
            }
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />{" "}
            {editing ? "Back to Order" : "Back to Orders"}
          </Link>
          <h1 className="mt-3 text-2xl font-extrabold">
            {editing ? "Edit Order" : "Create Order"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {editing
              ? orderNumber
              : "Create a phone or admin order using the shared checkout workflow."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCheckFraud ? (
            <Button
              type="button"
              variant="secondary"
              icon={<ShieldCheck className="h-4 w-4" />}
              onClick={() => setFraudModalOpen(true)}
            >
              Fraud Check
            </Button>
          ) : null}
          <Button type="submit" isLoading={saving} icon={<Save className="h-4 w-4" />}>
            {editing ? "Save Changes" : "Create Order"}
          </Button>
        </div>
      </div>
      <Panel title="Customer">
        <div className="grid gap-3 md:grid-cols-3">
          <FieldSelect
            label="Customer Type"
            value={customerType}
            values={[
              ["new_guest", "New Guest"],
              ["registered", "Registered Customer"],
              ["guest", "Existing Guest"],
            ]}
            onChange={(value) => {
              setCustomerType(value);
              setCustomerId("");
            }}
          />
          <FieldSelect
            label="Select Customer"
            value={customerId}
            disabled={customerType === "new_guest"}
            values={(customerType === "registered"
              ? options.registered_customers
              : options.guest_customers
            ).map((item) => [
              String(item.id),
              `${item.name} · ${item.phone ?? item.email ?? ""}`,
            ])}
            onChange={setCustomerId}
            placeholder={
              customerType === "new_guest" ? "New guest details below" : "Select customer"
            }
          />
          <Input
            label="Name"
            required
            value={customer.name}
            onChange={(event) => setCustomer({ ...customer, name: event.target.value })}
          />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input
            label="Email"
            type="email"
            value={customer.email}
            onChange={(event) => setCustomer({ ...customer, email: event.target.value })}
          />
          <Input
            label="Phone"
            required
            value={customer.phone}
            onChange={(event) => setCustomer({ ...customer, phone: event.target.value })}
          />
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <AddressForm title="Billing Address" value={billing} onChange={setBilling} />
        <div>
          <AddressForm title="Shipping Address" value={shipping} onChange={setShipping} />
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sameAddress}
              onChange={(event) => setSameAddress(event.target.checked)}
            />{" "}
            Use billing address for shipping
          </label>
        </div>
      </div>
      <Panel title="Products">
        <div className="space-y-3">
          {items.map((item) => (
            <OrderItemRow
              key={item.key}
              item={item}
              onChange={updateItem}
              onRemove={(key) =>
                setItems((current) => current.filter((entry) => entry.key !== key))
              }
            />
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-4"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setItems((current) => [...current, emptyItem()])}
        >
          Add Product
        </Button>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="Order Information">
          <div className="grid gap-3 md:grid-cols-2">
            <FieldSelect
              label="Shipping Method"
              value={shippingMethodId}
              values={options.shipping_methods.map((item) => [
                String(item.id),
                `${item.name} · ${formatPrice(item.rate)}`,
              ])}
              onChange={(value) => {
                setShippingMethodId(value);
                setShippingCharge(
                  String(
                    options.shipping_methods.find((item) => String(item.id) === value)
                      ?.rate ?? 0,
                  ),
                );
              }}
              placeholder="No shipping method"
            />
            <Input
              label="Shipping Charge"
              type="number"
              min="0"
              step="0.01"
              value={shippingCharge}
              onChange={(event) => setShippingCharge(event.target.value)}
            />
            <Input
              label="Tax"
              type="number"
              min="0"
              step="0.01"
              value={tax}
              onChange={(event) => setTax(event.target.value)}
            />
            <Input
              label="Coupon Code"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
            />
            <Input
              label="Coupon Discount"
              type="number"
              min="0"
              step="0.01"
              value={couponDiscount}
              onChange={(event) => setCouponDiscount(event.target.value)}
            />
            <Input
              label="Additional Discount"
              type="number"
              min="0"
              step="0.01"
              value={additionalDiscount}
              onChange={(event) => setAdditionalDiscount(event.target.value)}
            />
            <FieldSelect
              label="Payment Method"
              value={paymentMethod}
              values={options.payment_methods.map((item) => [item.gateway, item.name])}
              onChange={setPaymentMethod}
            />
            <FieldSelect
              label="Payment Status"
              value={paymentStatus}
              values={options.statuses.payment.map((item) => [item, label(item)])}
              onChange={setPaymentStatus}
            />
            <FieldSelect
              label="Order Status"
              value={orderStatus}
              values={options.statuses.order.map((item) => [item, label(item)])}
              onChange={setOrderStatus}
            />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <TextArea
              label="Customer Notes"
              value={customerNotes}
              onChange={setCustomerNotes}
            />
            <TextArea
              label="Delivery Notes"
              value={deliveryNotes}
              onChange={setDeliveryNotes}
            />
            <TextArea
              label="Internal Admin Notes"
              value={adminNotes}
              onChange={setAdminNotes}
            />
          </div>
        </Panel>
        <Panel title="Order Summary">
          <Summary label="Subtotal" value={subtotal} />
          <Summary label="Item Discount" value={-itemDiscount} />
          <Summary label="Coupon Discount" value={-Number(couponDiscount || 0)} />
          <Summary label="Additional Discount" value={-Number(additionalDiscount || 0)} />
          <Summary label="Shipping" value={Number(shippingCharge || 0)} />
          <Summary label="Tax" value={Number(tax || 0)} />
          <Summary label="Grand Total" value={total} strong />
        </Panel>
      </div>
      <FraudCheckModal
        open={fraudModalOpen}
        onClose={() => setFraudModalOpen(false)}
        initial={{
          order_id: editing ? orderNumber : undefined,
          customer_id:
            !editing && customerType !== "new_guest" && customerId
              ? `${customerType}-${customerId}`
              : undefined,
          phone: customer.phone,
          name: customer.name,
          email: customer.email,
          billing_address: billing.address_line,
          shipping_address: shipping.address_line,
        }}
      />
    </form>
  );
}

function ProductPicker({
  value,
  onSelect,
}: {
  value: CreateOrderProduct | null;
  onSelect: (product: CreateOrderProduct) => void;
}) {
  const [search, setSearch] = useState(value?.name ?? "");
  const [results, setResults] = useState<CreateOrderProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setSearch(value?.name ?? "");
  }, [value]);
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        setResults((await orderManagementService.searchProducts(search)).data.products);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, search]);
  return (
    <label className="relative block space-y-2 text-sm font-semibold">
      <span>Product</span>
      <div className="flex h-11 items-center gap-2 rounded-lg border border-border bg-background px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          placeholder="Search product by name or SKU"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-background p-1 shadow-xl">
          {loading ? (
            <p className="p-3 text-xs text-muted-foreground">Searching products...</p>
          ) : results.length ? (
            results.map((product) => (
              <button
                key={product.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(product);
                  setSearch(product.name);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
              >
                <span>
                  <span className="block font-semibold">{product.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {product.sku ?? "No SKU"} · Stock {product.stock ?? 0}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold">
                  {formatPrice(product.price)}
                </span>
              </button>
            ))
          ) : (
            <p className="p-3 text-xs text-muted-foreground">No products found.</p>
          )}
        </div>
      ) : null}
    </label>
  );
}

function OrderItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: DraftItem;
  onChange: (key: string, patch: Partial<DraftItem>) => void;
  onRemove: (key: string) => void;
}) {
  const product = item.product;
  return (
    <div className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1.5fr_1fr_90px_110px_110px_auto] md:items-end">
      <ProductPicker
        value={product}
        onSelect={(selected) =>
          onChange(item.key, {
            product: selected,
            product_variant_id: "",
            unit_price: String(selected.price),
          })
        }
      />
      <FieldSelect
        label="Variant"
        value={item.product_variant_id}
        disabled={!product || product.variants.length === 0}
        values={(product?.variants ?? []).map((variant) => [
          String(variant.id),
          `${variant.label} · ${variant.sku ?? "No SKU"} · Stock ${variant.stock ?? 0}`,
        ])}
        onChange={(value) => {
          const variant = product?.variants.find((entry) => String(entry.id) === value);
          onChange(item.key, {
            product_variant_id: value,
            unit_price: String(variant?.price ?? product?.price ?? 0),
          });
        }}
        placeholder={product?.variants.length ? "Select variant" : "Default"}
      />
      <Input
        label="Qty"
        type="number"
        min="1"
        value={item.quantity}
        onChange={(event) => onChange(item.key, { quantity: event.target.value })}
      />
      <Input
        label="Unit Price"
        type="number"
        min="0"
        step="0.01"
        value={item.unit_price}
        onChange={(event) => onChange(item.key, { unit_price: event.target.value })}
      />
      <Input
        label="Discount"
        type="number"
        min="0"
        step="0.01"
        value={item.discount}
        onChange={(event) => onChange(item.key, { discount: event.target.value })}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        icon={<Trash2 className="h-4 w-4" />}
        aria-label="Remove product"
        onClick={() => onRemove(item.key)}
      />
    </div>
  );
}

function addressFrom(address: Record<string, string | null> | null): Address {
  return { ...emptyAddress(), ...(address ?? {}) } as Address;
}
function label(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 font-bold">{title}</h2>
      {children}
    </section>
  );
}
function FieldSelect({
  label: title,
  value,
  values,
  onChange,
  disabled,
  placeholder = "Select",
}: {
  label: string;
  value: string;
  values: string[][];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2 text-sm font-semibold">
      <span>{title}</span>
      <Select
        value={value || "none"}
        disabled={disabled}
        onValueChange={(next) => onChange(next === "none" ? "" : next)}
      >
        <SelectTrigger className="h-11 rounded-lg">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{placeholder}</SelectItem>
          {values.map(([key, text]) => (
            <SelectItem key={key} value={key}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
function AddressForm({
  title,
  value,
  onChange,
}: {
  title: string;
  value: Address;
  onChange: (value: Address) => void;
}) {
  const set = (key: string, next: string) => onChange({ ...value, [key]: next });
  return (
    <Panel title={title}>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(value).map(([key, current]) => (
          <Input
            key={key}
            label={label(key)}
            required={[
              "full_name",
              "phone",
              "country",
              "state",
              "district",
              "city",
              "address_line",
            ].includes(key)}
            value={current}
            onChange={(event) => set(key, event.target.value)}
          />
        ))}
      </div>
    </Panel>
  );
}
function TextArea({
  label: title,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2 text-sm font-semibold">
      <span>{title}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-transparent bg-muted px-3 py-2 text-sm outline-none focus:border-primary focus:bg-background"
      />
    </label>
  );
}
function Summary({
  label: title,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-1 ${strong ? "border-t border-border pt-3 font-bold" : "text-sm"}`}
    >
      <span>{title}</span>
      <span>{formatPrice(value)}</span>
    </div>
  );
}
