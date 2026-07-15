"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Edit3, Filter, ImagePlus, Loader2, Newspaper, Plus, Search, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";
import { useUrlQueryState } from "@/features/admin/shared/hooks/use-url-query-state";
import { blogManagementService } from "@/features/admin/blogs/services/blog-management-service";
import type { BlogPayload, BlogStatus, ManagedBlog } from "@/features/admin/blogs/types";
import type { Option, PaginationMeta } from "@/features/admin/shared/types";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";

const statuses: BlogStatus[] = ["draft", "published", "archived"];
const pageSizes = [10, 20, 50, 100];

function normalizeBlogStatus(value: unknown, publishedAt?: string | null): BlogStatus {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");

  if (normalized === "publish" || normalized === "pusblished") {
    return "published";
  }

  if (statuses.includes(normalized as BlogStatus)) {
    return normalized as BlogStatus;
  }

  return publishedAt ? "published" : "draft";
}

const emptyForm: BlogPayload = {
  title: "",
  featured_image: "",
  featured_image_file: null,
  excerpt: "",
  content: "",
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  canonical_url: "",
  open_graph_image: "",
  author_id: null,
  status: "draft",
  published_at: "",
  featured: false,
  allow_comments_override: null,
};

type BlogFilters = {
  status: string;
  created_from: string;
  created_to: string;
  updated_from: string;
  updated_to: string;
};

export function BlogManagementContent() {
  const { query, setQuery } = useUrlQueryState("created_at");
  const [items, setItems] = useState<ManagedBlog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [authors, setAuthors] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [searchInput, setSearchInput] = useState(query.search);
  const [filterOpen, setFilterOpen] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; mode: "create" | "edit"; item: ManagedBlog | null }>({ open: false, mode: "create", item: null });
  const { confirmDelete, deleteConfirmationDialog } = useDeleteConfirmation();
  useAuthStore((state) => state.user?.permissions);
  const canCreate = hasPermission("can_create_blog");
  const canEdit = hasPermission("can_edit_blog");
  const canDelete = hasPermission("can_delete_blog");

  const filters = useMemo(() => ({
    status: query.status,
    created_from: query.created_from,
    created_to: query.created_to,
    updated_from: query.updated_from,
    updated_to: query.updated_to,
  }), [query.created_from, query.created_to, query.status, query.updated_from, query.updated_to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await blogManagementService.list({
        page: query.page,
        per_page: query.per_page,
        search: query.search,
        sort: query.sort,
        direction: query.direction,
        ...filters,
      });
      setItems(response.data.blogs);
      setPagination(response.meta.pagination ?? null);
      setAuthors(response.data.authors);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [filters, query.direction, query.page, query.per_page, query.search, query.sort]);

  useEffect(() => { void load(); }, [load]);

  async function submit(values: BlogPayload) {
    try {
      const payload = {
        ...values,
        author_id: values.author_id || undefined,
        meta_title: values.meta_title || null,
        meta_description: values.meta_description || null,
        meta_keywords: values.meta_keywords || null,
        canonical_url: values.canonical_url || null,
        open_graph_image: values.open_graph_image || null,
      };
      if (drawer.mode === "create") {
        await blogManagementService.create(payload);
        toast.success("Blog created successfully.");
      } else if (drawer.item) {
        await blogManagementService.update(drawer.item.id, payload);
        toast.success("Blog updated successfully.");
      }
      setDrawer({ open: false, mode: "create", item: null });
      await load();
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  const allSelected = items.length > 0 && items.every((item) => selected.includes(item.id));
  const page = pagination?.current_page ?? 1;
  const lastPage = pagination?.last_page ?? 1;

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Dashboard</span>
          <ChevronRight className="h-4 w-4" />
          <span>Blog Management</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Blogs</span>
        </div>

        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Blog Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create, publish, schedule, archive, and moderate storefront blog content.</p>
          </div>
          {canCreate ? <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setDrawer({ open: true, mode: "create", item: null })}>Create Blog</Button> : null}
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && setQuery({ search: searchInput, page: 1 })}
                placeholder="Search..."
                className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <Button size="sm" variant="secondary" icon={<Search className="h-4 w-4" />} onClick={() => setQuery({ search: searchInput, page: 1 })}>Search</Button>
            <Button size="sm" variant="secondary" icon={<Filter className="h-4 w-4" />} onClick={() => setFilterOpen(true)}>Advanced Filter</Button>
            {canDelete ? <Button
              size="sm"
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              disabled={selected.length === 0}
              onClick={() => confirmDelete({
                title: "Confirm Deletion",
                onConfirm: async () => {
                  await blogManagementService.bulkDelete(selected);
                  setSelected([]);
                  toast.success("Selected blogs deleted.");
                  await load();
                },
              })}
            >
              Bulk Delete
            </Button> : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : items.map((item) => item.id))} aria-label="Select all blogs" />
                  </th>
                  {[
                    ["title", "Title"],
                    ["author", "Author"],
                    ["status", "Status"],
                    ["views_count", "Views"],
                    ["created_at", "Created At"],
                  ].map(([key, label]) => (
                    <th key={key} className="px-4 py-3">
                      {["title", "status", "views_count", "created_at"].includes(key) ? (
                        <button type="button" className="inline-flex items-center gap-1 font-bold" onClick={() => setQuery({ sort: key, direction: query.sort === key && query.direction === "asc" ? "desc" : "asc", page: 1 })}>
                          {label} <ChevronsUpDown className="h-3.5 w-3.5" />
                        </button>
                      ) : label}
                    </th>
                  ))}
                  {canEdit || canDelete ? <th className="px-4 py-3 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6 + (canEdit || canDelete ? 1 : 0)} className="h-48 text-center text-muted-foreground">
                      <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading blogs...</span>
                    </td>
                  </tr>
                ) : items.length ? items.map((blog) => (
                  <tr key={blog.id} className="border-t border-border hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(blog.id)} onChange={() => setSelected((current) => current.includes(blog.id) ? current.filter((id) => id !== blog.id) : [...current, blog.id])} aria-label={`Select ${blog.title}`} />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold">{blog.title}</p>
                        <p className="text-xs text-muted-foreground">/{blog.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">{blog.author?.name ?? "Not assigned"}</td>
                    <td className="px-4 py-3"><StatusPill status={blog.status} /></td>
                    <td className="px-4 py-3">{blog.views_count}</td>
                    <td className="px-4 py-3">{formatDate(blog.created_at)}</td>
                    {canEdit || canDelete ? <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canEdit ? <Button variant="ghost" size="icon" icon={<Edit3 className="h-4 w-4" />} title="Edit" aria-label="Edit" onClick={() => setDrawer({ open: true, mode: "edit", item: blog })} /> : null}
                        {canDelete ? <Button variant="ghost" size="icon" icon={<Trash2 className="h-4 w-4" />} title="Delete" aria-label="Delete" onClick={() => confirmDelete({
                          title: "Confirm Deletion",
                          onConfirm: async () => {
                            await blogManagementService.delete(blog.id);
                            toast.success("Blog deleted.");
                            await load();
                          },
                        })} /> : null}
                      </div>
                    </td> : null}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6 + (canEdit || canDelete ? 1 : 0)} className="h-48 text-center">
                      <Newspaper className="mx-auto h-10 w-10 text-muted-foreground" />
                      <p className="mt-3 font-semibold">No records found</p>
                      <p className="mt-1 text-sm text-muted-foreground">Try changing filters or create a new blog.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Total Records: <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span></p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(pagination?.per_page ?? 10)} onValueChange={(value) => setQuery({ per_page: Number(value), page: 1 })}>
                <SelectTrigger className="h-9 w-[110px] rounded-lg px-2 text-sm" aria-label="Rows per page"><SelectValue /></SelectTrigger>
                <SelectContent>{pageSizes.map((size) => <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="secondary" size="sm" icon={<ChevronLeft className="h-4 w-4" />} disabled={page <= 1} onClick={() => setQuery({ page: page - 1 })}>Previous</Button>
              {Array.from({ length: Math.min(lastPage, 5) }, (_, index) => {
                const start = Math.max(1, Math.min(page - 2, lastPage - 4));
                const pageNumber = start + index;
                if (pageNumber > lastPage) return null;
                return <Button key={pageNumber} variant={pageNumber === page ? "primary" : "secondary"} size="sm" onClick={() => setQuery({ page: pageNumber })}>{pageNumber}</Button>;
              })}
              <Button variant="secondary" size="sm" icon={<ChevronRight className="h-4 w-4" />} disabled={page >= lastPage} onClick={() => setQuery({ page: page + 1 })}>Next</Button>
            </div>
          </div>
        </section>
      </div>

      <BlogFilterModal open={filterOpen} filters={filters} onClose={() => setFilterOpen(false)} onApply={(value) => { setQuery({ ...value, page: 1 }); setFilterOpen(false); }} />
      {deleteConfirmationDialog}
      <BlogDrawer open={drawer.open} mode={drawer.mode} blog={drawer.item} authors={authors} onClose={() => setDrawer({ open: false, mode: "create", item: null })} onSubmit={submit} />
    </>
  );
}

function BlogDrawer({ open, mode, blog, authors, onClose, onSubmit }: { open: boolean; mode: "create" | "edit"; blog: ManagedBlog | null; authors: Option[]; onClose: () => void; onSubmit: (values: BlogPayload) => Promise<void> }) {
  const [form, setForm] = useState<BlogPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [customSeo, setCustomSeo] = useState(false);

  useEffect(() => {
    const nextCustomSeo = Boolean(blog && [
      blog.meta_title,
      blog.meta_description,
      blog.meta_keywords,
      blog.canonical_url,
      blog.open_graph_image,
    ].some((value) => String(value ?? "").trim()));
    setCustomSeo(nextCustomSeo);
    const status = normalizeBlogStatus(blog?.status, blog?.published_at);
    setForm(blog ? {
      title: blog.title,
      featured_image: blog.featured_image,
      featured_image_file: null,
      excerpt: blog.excerpt,
      content: blog.content,
      meta_title: blog.meta_title ?? "",
      meta_description: blog.meta_description ?? "",
      meta_keywords: blog.meta_keywords ?? "",
      canonical_url: blog.canonical_url ?? "",
      open_graph_image: blog.open_graph_image ?? "",
      author_id: blog.author_id,
      status,
      published_at: blog.published_at?.slice(0, 10) ?? "",
      featured: blog.featured,
      allow_comments_override: blog.allow_comments_override,
    } : emptyForm);
  }, [blog, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close drawer backdrop" type="button" />
      <form
        className="absolute bottom-0 right-0 top-0 flex w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl sm:w-[42rem]"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          try {
            await onSubmit(customSeo ? form : {
              ...form,
              meta_title: null,
              meta_description: null,
              meta_keywords: null,
              canonical_url: null,
              open_graph_image: null,
            });
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-bold">{mode === "create" ? "Create Blog" : "Edit Blog"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage all publish, SEO, content, and comment controls.</p>
          </div>
          <Button variant="ghost" size="icon" icon={<X className="h-4 w-4" />} aria-label="Close drawer" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <Input required label="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          <BlogImagePicker
            value={form.featured_image}
            file={form.featured_image_file ?? null}
            onChange={(featured_image_file) => setForm((current) => ({ ...current, featured_image_file }))}
            onRemove={() => setForm((current) => ({ ...current, featured_image: "", featured_image_file: null }))}
          />
          <label className="block space-y-1.5 text-sm font-semibold">
            <span>Author</span>
            <Select value={form.author_id ? String(form.author_id) : ""} onValueChange={(value) => setForm((current) => ({ ...current, author_id: value ? Number(value) : null }))}>
                <SelectTrigger className="h-10 rounded-lg px-3 text-sm font-normal"><SelectValue placeholder="Current admin" /></SelectTrigger>
              <SelectContent>{authors.map((author) => <SelectItem key={author.id} value={String(author.id)}>{author.name}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <label className="block space-y-1.5 text-sm font-semibold">
            <span>Status</span>
            <Select value={form.status || "draft"} onValueChange={(value) => setForm((current) => ({ ...current, status: value as BlogStatus }))}>
              <SelectTrigger className="h-10 rounded-lg px-3 text-sm font-normal"><SelectValue>{statusLabel(form.status || "draft")}</SelectValue></SelectTrigger>
              <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <label className="space-y-1.5 text-sm font-semibold">
            <span>Short Description / Excerpt</span>
            <textarea required value={form.excerpt} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" />
          </label>
          <label className="space-y-1.5 text-sm font-semibold">
            <span>Full Content</span>
            <textarea required value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} className="min-h-56 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm font-semibold">
            Enable Custom SEO
            <input type="checkbox" checked={customSeo} onChange={(event) => setCustomSeo(event.target.checked)} />
          </label>
          {customSeo ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Meta Title" value={form.meta_title ?? ""} onChange={(event) => setForm((current) => ({ ...current, meta_title: event.target.value }))} />
                <Input label="Canonical URL" value={form.canonical_url ?? ""} onChange={(event) => setForm((current) => ({ ...current, canonical_url: event.target.value }))} />
                <Input label="Open Graph Image" value={form.open_graph_image ?? ""} onChange={(event) => setForm((current) => ({ ...current, open_graph_image: event.target.value }))} />
              </div>
              <label className="space-y-1.5 text-sm font-semibold">
                <span>Meta Keywords</span>
                <textarea value={form.meta_keywords ?? ""} onChange={(event) => setForm((current) => ({ ...current, meta_keywords: event.target.value }))} className="min-h-16 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" />
              </label>
              <label className="space-y-1.5 text-sm font-semibold">
                <span>Meta Description</span>
                <textarea value={form.meta_description ?? ""} onChange={(event) => setForm((current) => ({ ...current, meta_description: event.target.value }))} className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" />
              </label>
            </>
          ) : null}
          <label className="flex h-11 items-center justify-between rounded-lg border border-border px-3 text-sm font-semibold">
            Featured Blog
            <input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold">
            <span>Comments Override</span>
            <Select value={form.allow_comments_override === null || form.allow_comments_override === undefined ? "inherit" : String(form.allow_comments_override)} onValueChange={(value) => setForm((current) => ({ ...current, allow_comments_override: value === "inherit" ? null : value === "true" }))}>
              <SelectTrigger className="h-10 rounded-lg px-3 text-sm font-normal"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">Use global setting</SelectItem>
                <SelectItem value="true">Allow comments</SelectItem>
                <SelectItem value="false">Disable comments</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
        <div className="flex gap-2 border-t border-border p-5">
          <Button type="submit" size="sm" isLoading={saving}>{mode === "create" ? "Create Blog" : "Save Changes"}</Button>
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}

function BlogImagePicker({
  value,
  file,
  onChange,
  onRemove,
}: {
  value: string;
  file: File | null;
  onChange: (file: File | null) => void;
  onRemove: () => void;
}) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const image = preview || value;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Featured Image</p>
      <label
        className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-4 text-center transition hover:bg-muted"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onChange(event.dataTransfer.files.item(0));
        }}
      >
        {image ? (
          <div className="w-full space-y-3">
            <div className="relative mx-auto h-40 w-full max-w-sm overflow-hidden rounded-lg bg-muted">
              <Image src={image} alt="Featured image preview" fill unoptimized className="object-contain" />
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ImagePlus className="h-3.5 w-3.5" />
              <span>Click or drop an image to replace</span>
            </div>
            {file?.name ? <p className="truncate text-xs text-muted-foreground">{file.name}</p> : null}
          </div>
        ) : (
          <div className="space-y-2">
            <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">Drop featured image here</p>
            <p className="text-xs text-muted-foreground">Browse or drag JPG, PNG, WebP, AVIF, or GIF up to 10MB.</p>
          </div>
        )}
        <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/avif,image/gif" className="sr-only" onChange={(event) => onChange(event.target.files?.item(0) ?? null)} />
      </label>
      {image ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="secondary" onClick={onRemove}>Remove Image</Button>
        </div>
      ) : null}
    </div>
  );
}

function BlogFilterModal({ open, filters, onClose, onApply }: { open: boolean; filters: BlogFilters; onClose: () => void; onApply: (filters: BlogFilters) => void }) {
  const [draft, setDraft] = useState(filters);
  useEffect(() => setDraft(filters), [filters, open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close filters" type="button" />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-background p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-lg font-bold">Advanced Filter</h2><p className="mt-1 text-sm text-muted-foreground">Refine blogs by status and dates.</p></div>
          <Button variant="ghost" size="icon" icon={<X className="h-4 w-4" />} aria-label="Close filters" onClick={onClose} />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold">
            <span>Status</span>
            <Select value={draft.status || "all"} onValueChange={(status) => setDraft({ ...draft, status: status === "all" ? "" : status })}>
              <SelectTrigger className="h-11 rounded-lg px-3 text-sm"><SelectValue placeholder="Any status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                {statuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <DatePicker label="Created From" value={draft.created_from || null} onChange={(value) => setDraft({ ...draft, created_from: value })} />
          <DatePicker label="Created To" value={draft.created_to || null} onChange={(value) => setDraft({ ...draft, created_to: value })} />
          <DatePicker label="Updated From" value={draft.updated_from || null} onChange={(value) => setDraft({ ...draft, updated_from: value })} />
          <DatePicker label="Updated To" value={draft.updated_to || null} onChange={(value) => setDraft({ ...draft, updated_to: value })} />
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button size="sm" variant="secondary" onClick={() => setDraft({ status: "", created_from: "", created_to: "", updated_from: "", updated_to: "" })}>Reset Filters</Button>
          <Button size="sm" onClick={() => onApply(draft)}>Apply Filters</Button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: BlogStatus }) {
  return <span className={cn("rounded-full border border-border px-2 py-1 text-xs font-bold", status === "published" && "border-emerald-200 bg-emerald-50 text-emerald-700")}>{statusLabel(status)}</span>;
}

function statusLabel(status: BlogStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
