import { PublicInfoPage } from '@/components/content/PublicInfoPage';

export default function CareersPage() {
  return (
    <PublicInfoPage
      title="Careers"
      description="Build modern commerce experiences with a team focused on customers, reliability, and thoughtful product craft."
      cta={{ label: 'Contact us', href: '/contact' }}
      sections={[
        {
          title: 'Open Roles',
          body: 'Available roles are reviewed by the hiring team and published as they open. Please contact us with your resume and the role area you are interested in.',
        },
        {
          title: 'How We Work',
          body: 'We value clear ownership, customer empathy, clean execution, and continuous improvement across product, engineering, operations, and support.',
        },
        {
          title: 'Hiring Process',
          body: 'Shortlisted candidates are contacted for an introductory conversation, a role-specific assessment, and a final team discussion.',
        },
      ]}
    />
  );
}
