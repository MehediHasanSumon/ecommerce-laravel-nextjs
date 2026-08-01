import { ProtectedPage } from "@/components/layout/protected-page";
import { FraudSettingsContent } from "@/features/admin/fraud/components/fraud-settings-content";

export default function FraudDetectionSettingsPage() {
  return <ProtectedPage><FraudSettingsContent /></ProtectedPage>;
}
