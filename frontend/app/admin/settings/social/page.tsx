"use client";

import { ProtectedPage } from "@/components/layout/protected-page";
import { SocialMediaSettingsContent } from "@/features/admin/settings/components/settings-module-content";

export default function SocialSettingsPage() {
  return (
    <ProtectedPage>
      <SocialMediaSettingsContent />
    </ProtectedPage>
  );
}
