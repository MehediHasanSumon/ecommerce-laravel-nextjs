import { ProtectedPage } from "@/components/layout/protected-page";
import { AdminOrderEditContent } from "@/features/admin/orders/components/admin-order-edit-content";

export default async function AdminOrderEditPage({ params }: { params: Promise<{ order: string }> }) {
  const { order } = await params;
  return <ProtectedPage><AdminOrderEditContent orderNumber={decodeURIComponent(order)} /></ProtectedPage>;
}
