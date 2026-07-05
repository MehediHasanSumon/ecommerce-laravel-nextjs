import { use } from "react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { CollectionFormPage } from "@/features/admin/products/components/collection-form-page";

export default function AdminCollectionEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <ProtectedPage>
      <CollectionFormPage mode="edit" collectionId={Number(id)} />
    </ProtectedPage>
  );
}
