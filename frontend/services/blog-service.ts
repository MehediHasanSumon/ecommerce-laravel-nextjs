"use client";

import axios from "axios";
import type { ApiEnvelope, PaginationMeta } from "@/features/admin/shared/types";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

export type BlogSettingsRuntime = {
  enabled: boolean;
  layout: "grid" | "list";
  list_options: {
    enable_thumbnail: boolean;
    show_excerpt: boolean;
    show_author: boolean;
    show_published_date: boolean;
    show_reading_time: boolean;
  };
  show_on_home: boolean;
  home_limit: number;
  allow_comments: boolean;
  enable_related: boolean;
  enable_search: boolean;
  seo: {
    default_meta_title?: string | null;
    default_meta_description?: string | null;
    open_graph_image?: string | null;
    canonical_url?: string | null;
  };
};

export type BlogAuthor = {
  id: number;
  name: string;
};

export type BlogCard = {
  id: number;
  title: string;
  slug: string;
  featured_image: string;
  excerpt: string;
  author?: BlogAuthor;
  published_at: string | null;
  reading_time_minutes: number;
  views_count: number;
  featured: boolean;
};

export type BlogComment = {
  id: number;
  author_name: string;
  content: string;
  created_at: string | null;
  replies: BlogComment[];
};

export type BlogDetail = BlogCard & {
  content: string;
  meta_title?: string | null;
  meta_description?: string | null;
  open_graph_image?: string | null;
  allow_comments_override?: boolean | null;
  comments: BlogComment[];
};

export type BlogListResponse = {
  blogs: BlogCard[];
  settings: BlogSettingsRuntime;
  pagination: PaginationMeta;
};

export type BlogDetailResponse = {
  blog: BlogDetail;
  settings: BlogSettingsRuntime;
  related: BlogCard[];
};

export async function fetchBlogs(
  params: { page?: number | string; search?: string; sort?: string } = {},
  options: { signal?: AbortSignal } = {},
): Promise<BlogListResponse> {
  const response = await axios.get<ApiEnvelope<{ blogs: BlogCard[]; settings: BlogSettingsRuntime }>>(
    `${apiBaseUrl}/blogs`,
    {
      params,
      signal: options.signal,
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  return {
    blogs: response.data.data.blogs,
    settings: response.data.data.settings,
    pagination: response.data.meta.pagination ?? {
      current_page: 1,
      last_page: 1,
      per_page: 12,
      total: response.data.data.blogs.length,
      from: response.data.data.blogs.length ? 1 : null,
      to: response.data.data.blogs.length || null,
    },
  };
}

export async function fetchBlogDetail(
  slug: string,
  options: { signal?: AbortSignal } = {},
): Promise<BlogDetailResponse> {
  const response = await axios.get<ApiEnvelope<BlogDetailResponse>>(
    `${apiBaseUrl}/blogs/${encodeURIComponent(slug)}`,
    {
      signal: options.signal,
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  return response.data.data;
}

export async function fetchHomeBlogs(options: { signal?: AbortSignal } = {}) {
  const response = await axios.get<ApiEnvelope<{ blogs: BlogCard[]; settings: BlogSettingsRuntime }>>(
    `${apiBaseUrl}/blogs/home`,
    {
      signal: options.signal,
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  return response.data.data;
}

export async function submitBlogComment(
  slug: string,
  payload: { author_name: string; author_email: string; content: string; parent_id?: number | null },
) {
  const response = await axios.post<ApiEnvelope<{ comment: BlogComment }>>(
    `${apiBaseUrl}/blogs/${encodeURIComponent(slug)}/comments`,
    payload,
    {
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  return response.data;
}
