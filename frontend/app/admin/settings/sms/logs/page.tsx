import { ProtectedPage } from "@/components/layout/protected-page";
import { SmsLogsContent } from "@/features/admin/sms/components/sms-logs-content";

export default function SmsLogsPage() {
  return (
    <ProtectedPage>
      <SmsLogsContent />
    </ProtectedPage>
  );
}
