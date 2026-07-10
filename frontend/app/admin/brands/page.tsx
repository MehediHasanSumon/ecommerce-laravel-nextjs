"use client";

import { ProtectedPage } from "@/components/layout/protected-page";
import { ProductManagementContent } from "@/features/admin/products/components/product-management-content";
import { selectBrandsEnabled, selectSettingsPending, useSettingsStore } from "@/store/settings-store";

export default function AdminBrandsPage() {
  const brandsEnabled = useSettingsStore(selectBrandsEnabled);
  const pending = useSettingsStore(selectSettingsPending);

  return (
    <ProtectedPage>
      {!pending && brandsEnabled ? (
        <ProductManagementContent module="brands" />
      ) : null}
    </ProtectedPage>
  );
}
