import { ProtectedPage } from "@/components/layout/protected-page";
import { HomePageSettingsContent } from "@/features/admin/settings/components/home-page-settings-content";

export default function AdminHomePageSettingsPage() {
  return (
    <ProtectedPage>
      <HomePageSettingsContent />
    </ProtectedPage>
  );
}
