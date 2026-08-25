"use client";

import { ProtectedPage } from "@/components/layout/protected-page";
import { FooterSettingsContent } from "@/features/admin/settings/components/footer-settings-content";

export default function FooterSettingsPage() {
  return (
    <ProtectedPage>
      <FooterSettingsContent />
    </ProtectedPage>
  );
}
