import { ProtectedPage } from "@/components/layout/protected-page";
import { ProductWizardPage } from "@/features/admin/products/components/wizard/product-wizard-page";

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <ProtectedPage>
      <ProductWizardPage mode="edit" productId={Number(id)} />
    </ProtectedPage>
  );
}
