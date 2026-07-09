import { ProtectedPage } from "@/components/layout/protected-page";
import { ReportContent } from "@/features/admin/reports/components/report-content";

export default function SalesReportsPage() {
  return (
    <ProtectedPage>
      <ReportContent type="sales" />
    </ProtectedPage>
  );
}
