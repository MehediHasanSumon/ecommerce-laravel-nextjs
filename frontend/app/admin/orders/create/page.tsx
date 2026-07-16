import { ProtectedPage } from "@/components/layout/protected-page";
import { AdminOrderCreateContent } from "@/features/admin/orders/components/admin-order-create-content";

export default function AdminOrderCreatePage() {
  return <ProtectedPage><AdminOrderCreateContent /></ProtectedPage>;
}
