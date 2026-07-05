import { ProtectedPage } from "@/components/layout/protected-page";
import { PermissionManagementContent } from "@/features/admin/permissions/components/permission-management-content";

export default function AdminPermissionsPage() {
  return (
    <ProtectedPage>
      <PermissionManagementContent />
    </ProtectedPage>
  );
}
