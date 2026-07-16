import { ProtectedPage } from "@/components/layout/protected-page";
import { CustomerManagementContent } from "@/features/admin/customers/components/customer-management-content";

export default function CustomersPage() {
  return (
    <ProtectedPage>
      <CustomerManagementContent />
    </ProtectedPage>
  );
}
