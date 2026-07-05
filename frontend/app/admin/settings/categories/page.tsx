import { ProtectedPage } from "@/components/layout/protected-page";
import { SettingsModuleContent } from "@/features/admin/settings/components/settings-module-content";

export default function CategoryDisplaySettingsPage() {
  return (
    <ProtectedPage>
      <SettingsModuleContent module="categories" />
    </ProtectedPage>
  );
}
