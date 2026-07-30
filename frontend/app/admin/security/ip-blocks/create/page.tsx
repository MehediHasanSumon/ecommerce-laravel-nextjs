import { ProtectedPage } from "@/components/layout/protected-page";
import { IpBlockFormContent } from "@/features/admin/ip-blocks/components/ip-block-form-content";

export default function CreateIpBlockPage() {
  return <ProtectedPage><IpBlockFormContent /></ProtectedPage>;
}
