import { ProtectedPage } from "@/components/layout/protected-page";
import { ProfileContent } from "@/features/dashboard/components/profile-content";

export default function ProfilePage() {
  return (
    <ProtectedPage>
      <ProfileContent />
    </ProtectedPage>
  );
}
