"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, LayoutList, MessageSquare, RotateCcw, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FormGrid,
  ImageDropzone,
  SelectInput,
  SettingsGrid,
  SettingsPageShell,
  SettingsSection,
  TextareaInput,
  TextInput,
  ToggleSwitch,
} from "@/features/admin/settings/components/settings-primitives";
import { settingsApi } from "@/features/admin/settings/services/settings-service";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";

type BlogSettingsForm = {
  enabled: boolean;
  layout: "grid" | "list";
  list_enable_thumbnail: boolean;
  list_show_excerpt: boolean;
  list_show_author: boolean;
  list_show_published_date: boolean;
  list_show_reading_time: boolean;
  show_on_home: boolean;
  home_limit: number;
  allow_comments: boolean;
  enable_related: boolean;
  enable_search: boolean;
  default_meta_title: string;
  default_meta_description: string;
  open_graph_image: string;
  canonical_url: string;
};

const defaults: BlogSettingsForm = {
  enabled: false,
  layout: "grid",
  list_enable_thumbnail: true,
  list_show_excerpt: true,
  list_show_author: true,
  list_show_published_date: true,
  list_show_reading_time: true,
  show_on_home: false,
  home_limit: 3,
  allow_comments: true,
  enable_related: true,
  enable_search: true,
  default_meta_title: "Blog",
  default_meta_description: "Read the latest articles and updates from our store.",
  open_graph_image: "",
  canonical_url: "",
};

export function BlogSettingsContent() {
  const [form, setForm] = useState<BlogSettingsForm>(defaults);
  const [initial, setInitial] = useState<BlogSettingsForm>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useAuthStore((state) => state.user?.permissions ?? []);
  const canEdit = hasPermission("can_edit_blog_setting");

  useEffect(() => {
    let active = true;
    settingsApi.get<{ settings: BlogSettingsForm }>("blog")
      .then((response) => {
        if (!active) return;
        const next = normalize(response.data.settings);
        setForm(next);
        setInitial(next);
      })
      .catch((error) => toast.error(toAppError(error).message))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, []);

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  async function save() {
    if (!canEdit) return;
    try {
      setSaving(true);
      const response = await settingsApi.update<BlogSettingsForm, { settings: BlogSettingsForm }>("blog", form);
      const next = normalize(response.data.settings);
      setForm(next);
      setInitial(next);
      toast.success(response.message || "Blog settings saved.");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <SettingsPageShell
        title="Blog Settings"
        description="Control blog availability, listing layout, home placement, comments, search, and SEO defaults."
        icon={FileText}
        actions={canEdit ? (
          <>
            {isDirty ? <span className="inline-flex items-center rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">Unsaved changes</span> : null}
            <Button type="button" variant="secondary" size="sm" icon={<RotateCcw className="h-4 w-4" />} disabled={!isDirty || loading} onClick={() => setForm(initial)}>Reset</Button>
            <Button type="submit" size="sm" isLoading={saving} icon={<Save className="h-4 w-4" />} disabled={loading}>Save Settings</Button>
          </>
        ) : null}
      >
        <SettingsGrid>
          <SettingsSection title="Availability" description="Disable this to remove the blog from all storefront routes and menus." icon={FileText}>
            <FormGrid>
              <ToggleSwitch
                label="Enable Blog"
                description="OFF makes blog routes and public APIs return not found."
                checked={form.enabled}
                onChange={(enabled) => setForm((current) => ({ ...current, enabled }))}
              />
              <ToggleSwitch
                label="Show Blog Section on Home Page"
                description="Render the latest published posts on the home page."
                checked={form.show_on_home}
                onChange={(show_on_home) => setForm((current) => ({ ...current, show_on_home }))}
              />
              <SelectInput
                label="Home Page Blog Limit"
                value={String(form.home_limit)}
                options={[3, 4, 6, 8].map((value) => ({ label: `${value} posts`, value: String(value) }))}
                onChange={(value) => setForm((current) => ({ ...current, home_limit: Number(value) }))}
              />
            </FormGrid>
          </SettingsSection>

          <SettingsSection title="Listing Layout" description="Choose the global layout for the blog listing page." icon={LayoutList}>
            <FormGrid>
              <SelectInput
                label="Blog Layout"
                value={form.layout}
                options={[
                  { label: "Grid View", value: "grid" },
                  { label: "List View", value: "list" },
                ]}
                onChange={(layout) => setForm((current) => ({ ...current, layout: layout as BlogSettingsForm["layout"] }))}
              />
            </FormGrid>
            {form.layout === "list" ? (
              <div className="mt-4 grid gap-3.5 md:grid-cols-2">
                <ToggleSwitch label="Enable Thumbnail" checked={form.list_enable_thumbnail} onChange={(value) => setForm((current) => ({ ...current, list_enable_thumbnail: value }))} />
                <ToggleSwitch label="Show Blog Excerpt" checked={form.list_show_excerpt} onChange={(value) => setForm((current) => ({ ...current, list_show_excerpt: value }))} />
                <ToggleSwitch label="Show Author" checked={form.list_show_author} onChange={(value) => setForm((current) => ({ ...current, list_show_author: value }))} />
                <ToggleSwitch label="Show Published Date" checked={form.list_show_published_date} onChange={(value) => setForm((current) => ({ ...current, list_show_published_date: value }))} />
                <ToggleSwitch label="Show Reading Time" checked={form.list_show_reading_time} onChange={(value) => setForm((current) => ({ ...current, list_show_reading_time: value }))} />
              </div>
            ) : null}
          </SettingsSection>

          <SettingsSection title="Interactions" description="Enable or disable blog comments, related posts, and search." icon={MessageSquare}>
            <FormGrid>
              <ToggleSwitch label="Allow User Comments" checked={form.allow_comments} onChange={(value) => setForm((current) => ({ ...current, allow_comments: value }))} />
              <ToggleSwitch label="Enable Related Blogs" checked={form.enable_related} onChange={(value) => setForm((current) => ({ ...current, enable_related: value }))} />
              <ToggleSwitch label="Enable Search" checked={form.enable_search} onChange={(value) => setForm((current) => ({ ...current, enable_search: value }))} />
            </FormGrid>
          </SettingsSection>

          <SettingsSection title="SEO Settings" description="Default metadata used when individual posts do not provide their own values." icon={Search}>
            <FormGrid>
              <TextInput label="Default Meta Title" value={form.default_meta_title} onChange={(event) => setForm((current) => ({ ...current, default_meta_title: event.target.value }))} />
              <TextInput label="Canonical URL" value={form.canonical_url} onChange={(event) => setForm((current) => ({ ...current, canonical_url: event.target.value }))} />
            </FormGrid>
            <div className="mt-3.5 grid gap-3.5 md:grid-cols-2">
              <TextareaInput label="Default Meta Description" value={form.default_meta_description} onChange={(event) => setForm((current) => ({ ...current, default_meta_description: event.target.value }))} />
              <ImageDropzone label="Open Graph Image" value={form.open_graph_image} onChange={(value) => setForm((current) => ({ ...current, open_graph_image: value }))} />
            </div>
          </SettingsSection>
        </SettingsGrid>
      </SettingsPageShell>
    </form>
  );
}

function normalize(settings: Partial<BlogSettingsForm>): BlogSettingsForm {
  return {
    ...defaults,
    ...settings,
    default_meta_title: settings.default_meta_title ?? "",
    default_meta_description: settings.default_meta_description ?? "",
    open_graph_image: settings.open_graph_image ?? "",
    canonical_url: settings.canonical_url ?? "",
  };
}
