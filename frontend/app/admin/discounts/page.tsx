import { ProtectedPage } from "@/components/layout/protected-page";
import { ProductManagementContent } from "@/features/admin/products/components/product-management-content";

export default function AdminDiscountsPage() {
  return (
    <ProtectedPage>
      <ProductManagementContent module="discounts" />
    </ProtectedPage>
  );
}
