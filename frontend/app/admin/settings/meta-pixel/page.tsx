import { ProtectedPage } from "@/components/layout/protected-page";
import { MetaPixelSettingsContent } from "@/features/admin/marketing/components/marketing-settings-content";

export default function MetaPixelSettingsPage() {
  return <ProtectedPage><MetaPixelSettingsContent /></ProtectedPage>;
}
