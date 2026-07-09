import { ProtectedPage } from "@/components/layout/protected-page";
import { ReportContent } from "@/features/admin/reports/components/report-content";

export default function ShippingReportsPage() {
  return (
    <ProtectedPage>
      <ReportContent type="shipping" />
    </ProtectedPage>
  );
}
