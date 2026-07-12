"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Home, Layers3, Megaphone, PackageSearch, RotateCcw, Save, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FormGrid,
  SelectInput,
  SettingsGrid,
  SettingsPageShell,
  SettingsSection,
  TextInput,
  ToggleSwitch,
} from "@/features/admin/settings/components/settings-primitives";
import { settingsApi } from "@/features/admin/settings/services/settings-service";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";

type HomePageSettingsForm = {
  enable_product_section: boolean;
  products_per_section: number;
  enable_testimonial_section: boolean;
  announcement_enabled: boolean;
  announcement_text: string;
  announcement_link_text: string;
  announcement_link_url: string;
};

type CategoryDisplaySettingsForm = {
  enable_home_category_section: boolean;
  category_display_mode: "landing_page" | "home_grid_navbar_dropdown" | "navbar_dropdown_only";
};

type BrandSettingsForm = {
  enabled: boolean;
  show_on_home: boolean;
};

type MergedHomePageSettingsForm = {
  home: HomePageSettingsForm;
  categories: CategoryDisplaySettingsForm;
  brand: BrandSettingsForm;
};

const defaults: HomePageSettingsForm = {
  enable_product_section: true,
  products_per_section: 20,
  enable_testimonial_section: true,
  announcement_enabled: true,
  announcement_text: "Free shipping on orders over ৳75.00! Limited time offer.",
  announcement_link_text: "Shop Now",
  announcement_link_url: "/shop",
};

const categoryDefaults: CategoryDisplaySettingsForm = {
  enable_home_category_section: true,
  category_display_mode: "landing_page",
};

const brandDefaults: BrandSettingsForm = {
  enabled: true,
  show_on_home: true,
};

const mergedDefaults: MergedHomePageSettingsForm = {
  home: defaults,
  categories: categoryDefaults,
  brand: brandDefaults,
};

const productLimits = [8, 12, 16, 20, 24];

export function HomePageSettingsContent() {
  const [form, setForm] = useState<MergedHomePageSettingsForm>(mergedDefaults);
  const [initial, setInitial] = useState<MergedHomePageSettingsForm>(mergedDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useAuthStore((state) => state.user?.permissions);
  const canEdit = hasPermission("can_edit_home_page_setting");

  useEffect(() => {
    let active = true;
    settingsApi.get<{ settings: MergedHomePageSettingsForm }>("home-page")
      .then((response) => {
        if (!active) return;
        const next = {
          home: normalize(response.data.settings.home),
          categories: normalizeCategories(response.data.settings.categories),
          brand: normalizeBrand(response.data.settings.brand),
        };
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
      const response = await settingsApi.update<MergedHomePageSettingsForm, { settings: MergedHomePageSettingsForm }>("home-page", form);
      const next = {
        home: normalize(response.data.settings.home),
        categories: normalizeCategories(response.data.settings.categories),
        brand: normalizeBrand(response.data.settings.brand),
      };
      setForm(next);
      setInitial(next);
      toast.success(response.message || "Home page settings saved.");
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
        title="Home Page Settings"
        description="Control home page product, category, brand, and customer testimonial sections without changing code."
        icon={Home}
        actions={canEdit ? (
          <>
            {isDirty ? <span className="inline-flex items-center rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">Unsaved changes</span> : null}
            <Button type="button" variant="secondary" size="sm" icon={<RotateCcw className="h-4 w-4" />} disabled={!isDirty || loading} onClick={() => setForm(initial)}>Reset</Button>
            <Button type="submit" size="sm" isLoading={saving} icon={<Save className="h-4 w-4" />} disabled={loading}>Save Settings</Button>
          </>
        ) : null}
      >
        <SettingsGrid>
          <SettingsSection title="Product Section" description="Enable the home product section and control how many products are rendered." icon={PackageSearch}>
            <FormGrid>
              <ToggleSwitch
                label="Enable Product Section"
                description="OFF removes the Products section from the home page."
                checked={form.home.enable_product_section}
                onChange={(enable_product_section) => setForm((current) => ({ ...current, home: { ...current.home, enable_product_section } }))}
              />
              <SelectInput
                label="Products Per Section"
                value={String(form.home.products_per_section)}
                options={productLimits.map((value) => ({ label: `${value} products`, value: String(value) }))}
                onChange={(value) => setForm((current) => ({ ...current, home: { ...current.home, products_per_section: Number(value) } }))}
              />
            </FormGrid>
          </SettingsSection>

          <SettingsSection title="Announcement Bar" description="Control the thin promotional header shown above the storefront navigation." icon={Megaphone}>
            <FormGrid>
              <ToggleSwitch
                label="Enable Announcement Bar"
                description="OFF hides the promotional header from the storefront."
                checked={form.home.announcement_enabled}
                onChange={(announcement_enabled) => setForm((current) => ({ ...current, home: { ...current.home, announcement_enabled } }))}
              />
              <TextInput
                label="Announcement Text"
                value={form.home.announcement_text}
                onChange={(event) => setForm((current) => ({ ...current, home: { ...current.home, announcement_text: event.target.value } }))}
                helper="Example: Free shipping on orders over ৳75.00! Limited time offer."
              />
              <TextInput
                label="Link Text"
                value={form.home.announcement_link_text}
                onChange={(event) => setForm((current) => ({ ...current, home: { ...current.home, announcement_link_text: event.target.value } }))}
              />
              <TextInput
                label="Link URL"
                value={form.home.announcement_link_url}
                onChange={(event) => setForm((current) => ({ ...current, home: { ...current.home, announcement_link_url: event.target.value } }))}
                helper="Use a relative path like /shop or a full https URL."
              />
            </FormGrid>
          </SettingsSection>

          <SettingsSection title="Category Display" description="Control the home category section, navbar dropdown behavior, and category landing route." icon={Layers3}>
            <FormGrid>
              <ToggleSwitch
                label="Enable Category Section on Home Page"
                description="OFF removes the category section from the home page."
                checked={form.categories.enable_home_category_section}
                onChange={(enable_home_category_section) => setForm((current) => ({ ...current, categories: { ...current.categories, enable_home_category_section } }))}
              />
              <SelectInput
                label="Category Display Mode"
                value={form.categories.category_display_mode}
                options={[
                  { label: "Category Landing Page Mode", value: "landing_page" },
                  { label: "Home Grid + Navbar Dropdown", value: "home_grid_navbar_dropdown" },
                  { label: "Navbar Dropdown Only", value: "navbar_dropdown_only" },
                ]}
                onChange={(category_display_mode) => setForm((current) => ({
                  ...current,
                  categories: {
                    ...current.categories,
                    category_display_mode: category_display_mode as CategoryDisplaySettingsForm["category_display_mode"],
                  },
                }))}
              />
            </FormGrid>
          </SettingsSection>

          <SettingsSection title="Brand Section" description="Control product brand management, storefront brand routes, filters, and home page visibility." icon={Building2}>
            <FormGrid>
              <ToggleSwitch
                label="Enable Brand"
                description="OFF hides storefront brand routes and brand management visibility."
                checked={form.brand.enabled}
                onChange={(enabled) => setForm((current) => ({ ...current, brand: { ...current.brand, enabled } }))}
              />
              <ToggleSwitch
                label="Show Brand Section on Home Page"
                description="Only applies while Brand is enabled."
                checked={form.brand.show_on_home}
                onChange={(show_on_home) => setForm((current) => ({ ...current, brand: { ...current.brand, show_on_home } }))}
              />
            </FormGrid>
          </SettingsSection>

          <SettingsSection title="Customer Testimonials" description="Control the What Our Customers Say section on the home page." icon={Star}>
            <FormGrid>
              <ToggleSwitch
                label="Enable Customer Testimonial Section"
                description="OFF removes the testimonial section and avoids loading review cards."
                checked={form.home.enable_testimonial_section}
                onChange={(enable_testimonial_section) => setForm((current) => ({ ...current, home: { ...current.home, enable_testimonial_section } }))}
              />
            </FormGrid>
          </SettingsSection>
        </SettingsGrid>
      </SettingsPageShell>
    </form>
  );
}

function normalize(settings: Partial<HomePageSettingsForm>): HomePageSettingsForm {
  const limit = Number(settings.products_per_section ?? defaults.products_per_section);

  return {
    enable_product_section: Boolean(settings.enable_product_section ?? defaults.enable_product_section),
    products_per_section: productLimits.includes(limit) ? limit : defaults.products_per_section,
    enable_testimonial_section: Boolean(settings.enable_testimonial_section ?? defaults.enable_testimonial_section),
    announcement_enabled: Boolean(settings.announcement_enabled ?? defaults.announcement_enabled),
    announcement_text: String(settings.announcement_text ?? defaults.announcement_text),
    announcement_link_text: String(settings.announcement_link_text ?? defaults.announcement_link_text),
    announcement_link_url: String(settings.announcement_link_url ?? defaults.announcement_link_url),
  };
}

function normalizeCategories(settings: Partial<CategoryDisplaySettingsForm>): CategoryDisplaySettingsForm {
  const mode = settings.category_display_mode;

  return {
    enable_home_category_section: Boolean(settings.enable_home_category_section ?? categoryDefaults.enable_home_category_section),
    category_display_mode: mode === "home_grid_navbar_dropdown" || mode === "navbar_dropdown_only" ? mode : "landing_page",
  };
}

function normalizeBrand(settings: Partial<BrandSettingsForm>): BrandSettingsForm {
  return {
    enabled: Boolean(settings.enabled ?? brandDefaults.enabled),
    show_on_home: Boolean(settings.show_on_home ?? brandDefaults.show_on_home),
  };
}
