import { ProtectedPage } from "@/components/layout/protected-page";
import { ReportContent } from "@/features/admin/reports/components/report-content";

export default function ProductPerformanceReportsPage() {
  return (
    <ProtectedPage>
      <ReportContent type="product-performance" />
    </ProtectedPage>
  );
}
