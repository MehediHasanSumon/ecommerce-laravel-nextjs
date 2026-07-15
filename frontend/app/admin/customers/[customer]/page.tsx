import { CustomerDetailContent } from "@/features/admin/customers/components/customer-management-content";

export default async function CustomerPage({ params }: { params: Promise<{ customer: string }> }) {
  const { customer } = await params;
  return <CustomerDetailContent customerId={customer} />;
}
