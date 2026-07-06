import { ProtectedPage } from "@/components/layout/protected-page";
import { BlogManagementContent } from "@/features/admin/blogs/components/blog-management-content";

export default function AdminBlogsPage() {
  return (
    <ProtectedPage>
      <BlogManagementContent />
    </ProtectedPage>
  );
}
