import { ProtectedPage } from "@/components/layout/protected-page";
import { ReportContent } from "@/features/admin/reports/components/report-content";

export default function CustomerAnalyticsReportsPage() {
  return (
    <ProtectedPage>
      <ReportContent type="customer-analytics" />
    </ProtectedPage>
  );
}
