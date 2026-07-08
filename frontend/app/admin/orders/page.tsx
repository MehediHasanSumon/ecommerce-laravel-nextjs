import { ProtectedPage } from "@/components/layout/protected-page";
import { OrderManagementContent } from "@/features/admin/orders/components/order-management-content";

export default function AdminOrdersPage() {
  return (
    <ProtectedPage>
      <OrderManagementContent />
    </ProtectedPage>
  );
}
