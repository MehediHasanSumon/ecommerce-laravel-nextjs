import { ProtectedPage } from "@/components/layout/protected-page";
import { ReportContent } from "@/features/admin/reports/components/report-content";

export default function RevenueReportsPage() {
  return (
    <ProtectedPage>
      <ReportContent type="revenue" />
    </ProtectedPage>
  );
}
