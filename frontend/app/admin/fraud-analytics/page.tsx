import { ProtectedPage } from "@/components/layout/protected-page";
import { FraudAnalyticsContent } from "@/features/admin/fraud/components/fraud-analytics-content";

export default function FraudAnalyticsPage() {
  return <ProtectedPage><FraudAnalyticsContent /></ProtectedPage>;
}
