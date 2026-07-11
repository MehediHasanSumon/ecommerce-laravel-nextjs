"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Home, Layers3, PackageSearch, RotateCcw, Save, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FormGrid,
  SelectInput,
  SettingsGrid,
  SettingsPageShell,
  SettingsSection,
  ToggleSwitch,
} from "@/features/admin/settings/components/settings-primitives";
import { settingsApi } from "@/features/admin/settings/services/settings-service";
import { toAppError } from "@/lib/errors";

type HomePageSettingsForm = {
  enable_product_section: boolean;
  products_per_section: number;
  enable_testimonial_section: boolean;
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

  useEffect(() => {
    let active = true;
    Promise.all([
      settingsApi.get<{ settings: HomePageSettingsForm }>("home-page"),
      settingsApi.get<{ settings: CategoryDisplaySettingsForm }>("categories"),
      settingsApi.get<{ settings: BrandSettingsForm }>("brand"),
    ])
      .then(([homeResponse, categoryResponse, brandResponse]) => {
        if (!active) return;
        const next = {
          home: normalize(homeResponse.data.settings),
          categories: normalizeCategories(categoryResponse.data.settings),
          brand: normalizeBrand(brandResponse.data.settings),
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
    try {
      setSaving(true);
      const [homeResponse, categoryResponse, brandResponse] = await Promise.all([
        settingsApi.update<HomePageSettingsForm, { settings: HomePageSettingsForm }>("home-page", form.home),
        settingsApi.update<CategoryDisplaySettingsForm, { settings: CategoryDisplaySettingsForm }>("categories", form.categories),
        settingsApi.update<BrandSettingsForm, { settings: BrandSettingsForm }>("brand", form.brand),
      ]);
      const next = {
        home: normalize(homeResponse.data.settings),
        categories: normalizeCategories(categoryResponse.data.settings),
        brand: normalizeBrand(brandResponse.data.settings),
      };
      setForm(next);
      setInitial(next);
      toast.success("Home page settings saved.");
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
        actions={(
          <>
            {isDirty ? <span className="inline-flex items-center rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">Unsaved changes</span> : null}
            <Button type="button" variant="secondary" size="sm" icon={<RotateCcw className="h-4 w-4" />} disabled={!isDirty || loading} onClick={() => setForm(initial)}>Reset</Button>
            <Button type="submit" size="sm" isLoading={saving} icon={<Save className="h-4 w-4" />} disabled={loading}>Save Settings</Button>
          </>
        )}
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
