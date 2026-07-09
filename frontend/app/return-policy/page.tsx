import { PublicInfoPage } from '@/components/content/PublicInfoPage';

export default function ReturnPolicyPage() {
  return (
    <PublicInfoPage
      title="Return Policy"
      description="Eligible products can be reviewed for return according to order status, product condition, and the applicable return window."
      cta={{ label: 'Contact support', href: '/contact' }}
      sections={[
        {
          title: 'Eligibility',
          body: 'Items should be unused, complete, and returned with original packaging where applicable. Some categories may be excluded for hygiene, safety, or digital fulfillment reasons.',
        },
        {
          title: 'Return Review',
          body: 'Return requests are reviewed against the order record, payment status, delivery status, and product-specific rules before approval.',
        },
        {
          title: 'Refunds',
          body: 'Approved refunds are processed back to the original payment method when supported by the payment gateway, or through an approved manual process.',
        },
      ]}
    />
  );
}
