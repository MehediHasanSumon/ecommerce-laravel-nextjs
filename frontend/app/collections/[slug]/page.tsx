import { use } from 'react';
import { CollectionPageContent } from '@/components/collection/CollectionPageContent';

export default function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  return <CollectionPageContent slug={slug} />;
}
