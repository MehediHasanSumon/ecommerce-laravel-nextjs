import { ProtectedPage } from "@/components/layout/protected-page";
import { SecuritySettingsContent } from "@/features/admin/ip-blocks/components/security-settings-content";

export default function SecuritySettingsPage() {
  return <ProtectedPage><SecuritySettingsContent /></ProtectedPage>;
}
