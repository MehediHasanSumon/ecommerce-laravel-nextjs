import { ProtectedPage } from "@/components/layout/protected-page";
import { MarketingAnalyticsContent } from "@/features/admin/marketing/components/marketing-analytics-content";

export default function MarketingAnalyticsPage() {
  return <ProtectedPage><MarketingAnalyticsContent /></ProtectedPage>;
}
