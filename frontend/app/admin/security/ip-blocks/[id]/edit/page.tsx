import { ProtectedPage } from "@/components/layout/protected-page";
import { IpBlockFormContent } from "@/features/admin/ip-blocks/components/ip-block-form-content";

export default async function EditIpBlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProtectedPage><IpBlockFormContent id={id} /></ProtectedPage>;
}
