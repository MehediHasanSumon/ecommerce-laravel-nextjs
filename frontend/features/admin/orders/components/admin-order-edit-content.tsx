"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { orderManagementService } from "@/features/admin/orders/services/order-management-service";
import { toAppError } from "@/lib/errors";
import { useRouter } from "next/navigation";

const orderStatuses = ["pending", "confirmed", "processing", "packed", "ready_for_shipment", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded"];
const paymentStatuses = ["pending", "paid", "failed", "cancelled", "refunded", "partially_refunded"];
const shippingStatuses = ["pending", "processing", "shipped", "delivered", "returned"];

export function AdminOrderEditContent({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<Awaited<ReturnType<typeof orderManagementService.show>>["data"]["order"] | null>(null);
  const [form, setForm] = useState({ status: "", payment_status: "", shipping_status: "", admin_notes: "", customer_notes: "", delivery_notes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await orderManagementService.show(orderNumber);
      setOrder(response.data.order);
      setForm({
        status: response.data.order.status,
        payment_status: response.data.order.paymentStatus,
        shipping_status: response.data.order.shippingStatus,
        admin_notes: response.data.order.adminNotes ?? "",
        customer_notes: response.data.order.customerNotes ?? "",
        delivery_notes: response.data.order.deliveryNotes ?? "",
      });
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }, [orderNumber]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await orderManagementService.update(orderNumber, {
        ...form,
        admin_notes: form.admin_notes || null,
        customer_notes: form.customer_notes || null,
        delivery_notes: form.delivery_notes || null,
        note: "Order details updated from admin edit page.",
      });
      toast.success("Order updated successfully.");
      router.push(`/admin/orders/${encodeURIComponent(orderNumber)}`);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!order) return <div className="h-64 animate-pulse rounded-lg bg-muted" />;

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/admin/orders/${encodeURIComponent(orderNumber)}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Order</Link>
          <h1 className="mt-3 text-2xl font-extrabold">Edit Order</h1>
          <p className="mt-1 text-sm text-muted-foreground">{order.orderNumber} · {order.customer.name}</p>
        </div>
        <Button type="submit" isLoading={saving} icon={<Save className="h-4 w-4" />}>Save Changes</Button>
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 font-bold">Order Status</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <StatusField label="Order Status" value={form.status} values={orderStatuses} onChange={(status) => setForm({ ...form, status })} />
          <StatusField label="Payment Status" value={form.payment_status} values={paymentStatuses} onChange={(payment_status) => setForm({ ...form, payment_status })} />
          <StatusField label="Shipping Status" value={form.shipping_status} values={shippingStatuses} onChange={(shipping_status) => setForm({ ...form, shipping_status })} />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 font-bold">Order Notes</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <NoteField label="Internal Admin Notes" value={form.admin_notes} onChange={(admin_notes) => setForm({ ...form, admin_notes })} />
          <NoteField label="Customer Notes" value={form.customer_notes} onChange={(customer_notes) => setForm({ ...form, customer_notes })} />
          <NoteField label="Delivery Notes" value={form.delivery_notes} onChange={(delivery_notes) => setForm({ ...form, delivery_notes })} />
        </div>
      </section>
    </form>
  );
}

function StatusField({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <label className="block space-y-2 text-sm font-semibold"><span>{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger><SelectContent>{values.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase())}</SelectItem>)}</SelectContent></Select></label>;
}

function NoteField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block space-y-2 text-sm font-semibold"><span>{label}</span><textarea rows={7} value={value} onChange={(event) => onChange(event.target.value)} className="w-full resize-none rounded-lg border border-transparent bg-muted px-3 py-2 text-sm outline-none focus:border-primary focus:bg-background" /></label>;
}
