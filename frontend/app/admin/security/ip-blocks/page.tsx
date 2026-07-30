import { ProtectedPage } from "@/components/layout/protected-page";
import { IpBlockManagementContent } from "@/features/admin/ip-blocks/components/ip-block-management-content";

export default function IpBlocksPage() {
  return <ProtectedPage><IpBlockManagementContent /></ProtectedPage>;
}
