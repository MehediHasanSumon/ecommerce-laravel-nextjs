import { PublicInfoPage } from '@/components/content/PublicInfoPage';

export default function GiftCardsPage() {
  return (
    <PublicInfoPage
      title="Gift Cards"
      description="Gift card support is prepared for the storefront and will use database-managed products, balances, and redemption rules when enabled."
      cta={{ label: 'Browse deals', href: '/deals' }}
      sections={[
        {
          title: 'Availability',
          body: 'Gift cards are shown when active gift card products or campaigns are configured in the catalog.',
        },
        {
          title: 'Redemption',
          body: 'Future gift card redemption will validate balances and eligibility on the server before applying credit to checkout.',
        },
        {
          title: 'Support',
          body: 'For existing gift card questions, contact support with your order number or purchase reference.',
        },
      ]}
    />
  );
}
