import { ProtectedPage } from "@/components/layout/protected-page";
import { CourierSettingsContent } from "@/features/admin/couriers/components/courier-settings-content";

export default function CourierSettingsPage() {
  return (
    <ProtectedPage>
      <CourierSettingsContent />
    </ProtectedPage>
  );
}
