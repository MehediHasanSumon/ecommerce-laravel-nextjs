import type { BaseRecord, Option } from "@/features/admin/shared/types";

export type BlogStatus = "draft" | "published" | "scheduled" | "archived";

export type ManagedBlog = BaseRecord & {
  title: string;
  slug: string;
  featured_image: string;
  excerpt: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  canonical_url: string | null;
  open_graph_image: string | null;
  author_id: number;
  author?: Option & { email?: string };
  status: BlogStatus;
  published_at: string | null;
  scheduled_publish_at: string | null;
  featured: boolean;
  allow_comments_override: boolean | null;
  views_count: number;
  reading_time_minutes: number;
  approved_comments_count: number;
};

export type BlogPayload = {
  title: string;
  featured_image: string;
  excerpt: string;
  content: string;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  canonical_url?: string | null;
  open_graph_image?: string | null;
  author_id?: number | null;
  status: BlogStatus;
  published_at?: string | null;
  scheduled_publish_at?: string | null;
  featured: boolean;
  allow_comments_override?: boolean | null;
};
