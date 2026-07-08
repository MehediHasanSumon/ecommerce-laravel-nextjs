import { ProtectedPage } from "@/components/layout/protected-page";
import { AdminOrderDetailContent } from "@/features/admin/orders/components/order-management-content";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ order: string }> }) {
  const { order } = await params;
  return (
    <ProtectedPage>
      <AdminOrderDetailContent orderNumber={decodeURIComponent(order)} />
    </ProtectedPage>
  );
}
