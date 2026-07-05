import { ProtectedPage } from "@/components/layout/protected-page";
import { SmsSettingsContent } from "@/features/admin/settings/components/settings-module-content";

export default function SmsSettingsPage() {
  return (
    <ProtectedPage>
      <SmsSettingsContent />
    </ProtectedPage>
  );
}
