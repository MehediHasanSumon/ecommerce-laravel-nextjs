import { ProtectedPage } from "@/components/layout/protected-page";
import { ProductManagementContent } from "@/features/admin/products/components/product-management-content";

export default function AdminAttributesPage() {
  return (
    <ProtectedPage>
      <ProductManagementContent module="attributes" />
    </ProtectedPage>
  );
}
