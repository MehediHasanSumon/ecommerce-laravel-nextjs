"use client";

import { ProtectedPage } from "@/components/layout/protected-page";
import { PaymentSettingsContent } from "@/features/admin/settings/components/settings-module-content";

export default function PaymentSettingsPage() {
  return (
    <ProtectedPage>
      <PaymentSettingsContent />
    </ProtectedPage>
  );
}
