import { PublicInfoPage } from '@/components/content/PublicInfoPage';

export default function PressPage() {
  return (
    <PublicInfoPage
      title="Press"
      description="Find brand information, media contact details, and company updates for editorial and partnership inquiries."
      cta={{ label: 'Contact press team', href: '/contact' }}
      sections={[
        {
          title: 'Media Inquiries',
          body: 'For interviews, company information, or media resources, send your inquiry through the contact page with Press in the subject line.',
        },
        {
          title: 'Brand Assets',
          body: 'Approved logos, product imagery, and brand references are shared directly with verified media partners.',
        },
        {
          title: 'Company Updates',
          body: 'Product launches, marketplace updates, and operational announcements are published through official company channels.',
        },
      ]}
    />
  );
}
