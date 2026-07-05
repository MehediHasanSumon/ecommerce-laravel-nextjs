import { ProtectedPage } from "@/components/layout/protected-page";
import { RoleManagementContent } from "@/features/admin/roles/components/role-management-content";

export default function AdminRolesPage() {
  return (
    <ProtectedPage>
      <RoleManagementContent />
    </ProtectedPage>
  );
}
