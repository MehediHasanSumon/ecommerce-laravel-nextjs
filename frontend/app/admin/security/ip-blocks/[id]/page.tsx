import { ProtectedPage } from "@/components/layout/protected-page";
import { IpBlockDetailContent } from "@/features/admin/ip-blocks/components/ip-block-detail-content";

export default async function IpBlockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProtectedPage><IpBlockDetailContent id={id} /></ProtectedPage>;
}
