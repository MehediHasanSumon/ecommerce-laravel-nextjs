"use client";

import { Suspense } from "react";
import { ProductManagementContent } from "@/features/admin/products/components/product-management-content";
import { ProtectedPage } from "@/components/layout/protected-page";

export default function AdminCommentsPage() {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-muted" />}>
      <ProtectedPage>
        <ProductManagementContent module="comments" />
      </ProtectedPage>
    </Suspense>
  );
}
