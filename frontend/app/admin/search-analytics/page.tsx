import { ProtectedPage } from "@/components/layout/protected-page";
import { SearchAnalyticsContent } from "@/features/admin/search-analytics/components/search-analytics-content";

export default function SearchAnalyticsPage() {
  return (
    <ProtectedPage>
      <SearchAnalyticsContent />
    </ProtectedPage>
  );
}
