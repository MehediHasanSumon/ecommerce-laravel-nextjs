import { ProtectedPage } from "@/components/layout/protected-page";
import { SmsSettingsContent } from "@/features/admin/sms/components/sms-settings-content";

export default function SmsSettingsPage() {
  return (
    <ProtectedPage>
      <SmsSettingsContent />
    </ProtectedPage>
  );
}
