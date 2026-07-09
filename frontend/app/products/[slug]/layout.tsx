import type { Metadata } from "next";
import { entityMetadata, entityStructuredData, JsonLd } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return entityMetadata("product", slug);
}

export default async function ProductSeoLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const structuredData = await entityStructuredData("product", slug);

  return (
    <>
      <JsonLd data={structuredData} />
      {children}
    </>
  );
}
