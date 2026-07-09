import { PublicInfoPage } from '@/components/content/PublicInfoPage';

export default function ShippingPolicyPage() {
  return (
    <PublicInfoPage
      title="Shipping Policy"
      description="Shipping options, costs, and delivery times are calculated dynamically at checkout based on your address and available shipping methods."
      cta={{ label: 'View orders', href: '/account/orders' }}
      sections={[
        {
          title: 'Available Methods',
          body: 'Available shipping methods depend on the shipping zone matched to your delivery country and address. Only active methods are shown during checkout.',
        },
        {
          title: 'Delivery Estimates',
          body: 'Estimated delivery times are provided with each shipping method. Delivery timelines may vary due to courier capacity, holidays, or address validation issues.',
        },
        {
          title: 'Shipping Charges',
          body: 'Shipping charges, free shipping rules, and minimum order amounts are managed from the shipping settings and recalculated before order placement.',
        },
      ]}
    />
  );
}
