import { ProtectedPage } from "@/components/layout/protected-page";
import { ShippingZonesContent } from "@/features/admin/shipping/components/shipping-management-content";

export default function ShippingZonesPage() {
  return (
    <ProtectedPage>
      <ShippingZonesContent />
    </ProtectedPage>
  );
}
