import { ProtectedPage } from "@/components/layout/protected-page";
import { HomeFeatureCardsSettingsContent } from "@/features/admin/feature-cards/components/feature-card-management-content";

export default function HomeFeatureCardSettingsPage() {
  return (
    <ProtectedPage>
      <HomeFeatureCardsSettingsContent />
    </ProtectedPage>
  );
}
