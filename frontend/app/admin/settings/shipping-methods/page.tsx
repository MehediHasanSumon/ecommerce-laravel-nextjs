import { ProtectedPage } from "@/components/layout/protected-page";
import { ShippingMethodsContent } from "@/features/admin/shipping/components/shipping-management-content";

export default function ShippingMethodsPage() {
  return (
    <ProtectedPage>
      <ShippingMethodsContent />
    </ProtectedPage>
  );
}
