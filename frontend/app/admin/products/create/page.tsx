import { ProtectedPage } from "@/components/layout/protected-page";
import { ProductWizardPage } from "@/features/admin/products/components/wizard/product-wizard-page";

export default function AdminProductCreatePage() {
  return (
    <ProtectedPage>
      <ProductWizardPage mode="create" />
    </ProtectedPage>
  );
}
