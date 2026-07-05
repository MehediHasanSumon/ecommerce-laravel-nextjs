import { ProtectedPage } from "@/components/layout/protected-page";
import { UserManagementContent } from "@/features/admin/users/components/user-management-content";

export default function AdminUsersPage() {
  return (
    <ProtectedPage>
      <UserManagementContent />
    </ProtectedPage>
  );
}
