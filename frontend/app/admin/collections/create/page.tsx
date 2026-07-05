import { ProtectedPage } from "@/components/layout/protected-page";
import { CollectionFormPage } from "@/features/admin/products/components/collection-form-page";

export default function AdminCollectionCreatePage() {
  return (
    <ProtectedPage>
      <CollectionFormPage mode="create" />
    </ProtectedPage>
  );
}
