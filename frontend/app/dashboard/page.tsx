import { ProtectedPage } from "@/components/layout/protected-page";
import { DashboardContent } from "@/features/dashboard/components/dashboard-content";

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <DashboardContent />
    </ProtectedPage>
  );
}
