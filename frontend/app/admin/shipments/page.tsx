import { ProtectedPage } from "@/components/layout/protected-page";
import { CourierShipmentsContent } from "@/features/admin/couriers/components/courier-shipments-content";

export default function CourierShipmentsPage() {
  return (
    <ProtectedPage>
      <CourierShipmentsContent />
    </ProtectedPage>
  );
}
