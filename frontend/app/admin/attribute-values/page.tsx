import { ProtectedPage } from "@/components/layout/protected-page";
import { ProductManagementContent } from "@/features/admin/products/components/product-management-content";

export default function AdminAttributeValuesPage() {
  return (
    <ProtectedPage>
      <ProductManagementContent module="attribute-values" />
    </ProtectedPage>
  );
}
