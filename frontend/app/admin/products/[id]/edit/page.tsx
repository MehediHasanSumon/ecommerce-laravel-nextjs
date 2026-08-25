import { ProtectedPage } from "@/components/layout/protected-page";
import { ProductFormPage } from "@/features/admin/products/components/product-form-page";

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <ProtectedPage>
      <ProductFormPage mode="edit" productId={Number(id)} />
    </ProtectedPage>
  );
}
