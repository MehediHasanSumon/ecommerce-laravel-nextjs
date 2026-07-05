"use client";

import { ProtectedPage } from "@/components/layout/protected-page";
import { ShippingSettingsContent } from "@/features/admin/settings/components/settings-module-content";

export default function ShippingSettingsPage() {
  return (
    <ProtectedPage>
      <ShippingSettingsContent />
    </ProtectedPage>
  );
}
