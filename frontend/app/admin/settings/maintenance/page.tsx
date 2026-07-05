"use client";

import { ProtectedPage } from "@/components/layout/protected-page";
import { SettingsModuleContent } from "@/features/admin/settings/components/settings-module-content";

export default function MaintenanceSettingsPage() {
  return (
    <ProtectedPage>
      <SettingsModuleContent module="maintenance" />
    </ProtectedPage>
  );
}
