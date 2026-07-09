import { PublicInfoPage } from '@/components/content/PublicInfoPage';

export default function SizeGuidePage() {
  return (
    <PublicInfoPage
      title="Size Guide"
      description="Use product details, variant options, and measurement notes to choose the right fit before checkout."
      cta={{ label: 'Shop products', href: '/shop' }}
      sections={[
        {
          title: 'Product Measurements',
          body: 'When size-specific measurements are available, they appear on the product details page with the selected variant or specification group.',
        },
        {
          title: 'Fit Notes',
          body: 'Check product descriptions, material details, and customer reviews for practical fit guidance before ordering.',
        },
        {
          title: 'Need Help',
          body: 'If you are between sizes or unsure about a product, contact support with the product name and your measurement details.',
        },
      ]}
    />
  );
}
