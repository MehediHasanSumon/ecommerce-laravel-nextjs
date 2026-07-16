import { AdminOrderEditContent } from "@/features/admin/orders/components/admin-order-edit-content";

export default async function AdminOrderEditPage({ params }: { params: Promise<{ order: string }> }) {
  const { order } = await params;
  return <AdminOrderEditContent orderNumber={decodeURIComponent(order)} />;
}
