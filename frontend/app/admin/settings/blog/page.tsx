import { ProtectedPage } from "@/components/layout/protected-page";
import { BlogSettingsContent } from "@/features/admin/settings/components/blog-settings-content";

export default function BlogSettingsPage() {
  return (
    <ProtectedPage>
      <BlogSettingsContent />
    </ProtectedPage>
  );
}
