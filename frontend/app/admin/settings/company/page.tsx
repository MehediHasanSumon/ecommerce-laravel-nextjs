import { ProtectedPage } from "@/components/layout/protected-page";
import { SettingsModuleContent } from "@/features/admin/settings/components/settings-module-content";

export default function CompanySettingsPage() {
  return (
    <ProtectedPage>
      <SettingsModuleContent module="company" />
    </ProtectedPage>
  );
}
