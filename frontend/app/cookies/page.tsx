import { PublicInfoPage } from '@/components/content/PublicInfoPage';

export default function CookiesPage() {
  return (
    <PublicInfoPage
      title="Cookie Policy"
      description="Cookies help keep the storefront secure, remember preferences, and improve shopping performance."
      sections={[
        {
          title: 'Required Cookies',
          body: 'Required cookies support authentication, cart synchronization, checkout continuity, security checks, and core site behavior.',
        },
        {
          title: 'Preference Cookies',
          body: 'Preference cookies may remember display, theme, region, or currency choices so the storefront feels consistent between visits.',
        },
        {
          title: 'Managing Cookies',
          body: 'You can manage cookies from your browser settings. Disabling required cookies may prevent account, cart, or checkout features from working correctly.',
        },
      ]}
    />
  );
}
