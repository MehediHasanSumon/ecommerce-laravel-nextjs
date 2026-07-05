import { ProtectedPage } from "@/components/layout/protected-page";
import { SettingsContent } from "@/features/dashboard/components/settings-content";

export default function SettingsPage() {
  return (
    <ProtectedPage>
      <SettingsContent />
    </ProtectedPage>
  );
}
