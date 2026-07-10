"use client";

import { ProtectedPage } from "@/components/layout/protected-page";
import { AdminDashboardContent } from "@/features/admin/dashboard/components/admin-dashboard-content";

export default function AdminDashboardPage() {
  return (
    <ProtectedPage>
      <AdminDashboardContent />
    </ProtectedPage>
  );
}
