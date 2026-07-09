import { ProtectedPage } from "@/components/layout/protected-page";
import { ContactMessagesContent } from "@/features/admin/contact-messages/components/contact-messages-content";

export default function AdminContactMessagesPage() {
  return (
    <ProtectedPage>
      <ContactMessagesContent />
    </ProtectedPage>
  );
}
