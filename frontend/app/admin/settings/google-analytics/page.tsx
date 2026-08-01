import { ProtectedPage } from "@/components/layout/protected-page";
import { GoogleAnalyticsSettingsContent } from "@/features/admin/marketing/components/marketing-settings-content";

export default function GoogleAnalyticsSettingsPage() {
  return <ProtectedPage><GoogleAnalyticsSettingsContent /></ProtectedPage>;
}
