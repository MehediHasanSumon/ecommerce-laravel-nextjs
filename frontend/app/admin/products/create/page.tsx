import { ProtectedPage } from "@/components/layout/protected-page";
import { ProductFormPage } from "@/features/admin/products/components/product-form-page";

export default function AdminProductCreatePage() {
  return (
    <ProtectedPage>
      <ProductFormPage mode="create" />
    </ProtectedPage>
  );
}
