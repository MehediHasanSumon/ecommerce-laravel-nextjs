import type { Metadata } from "next";
import { entityMetadata, entityStructuredData, JsonLd } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return entityMetadata("brand", slug);
}

export default async function BrandSeoLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const structuredData = await entityStructuredData("brand", slug);

  return (
    <>
      <JsonLd data={structuredData} />
      {children}
    </>
  );
}
