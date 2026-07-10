import { ProtectedPage } from "@/components/layout/protected-page";
import { HeroSectionManagementContent } from "@/features/admin/hero-section/components/hero-section-management-content";

export default function HeroSectionSettingsPage() {
  return (
    <ProtectedPage>
      <HeroSectionManagementContent />
    </ProtectedPage>
  );
}
