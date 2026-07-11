"use client";

import { useEffect, useMemo, useState } from "react";
import { Home, PackageSearch, RotateCcw, Save, Star } from "lucide-react";
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

const defaults: HomePageSettingsForm = {
  enable_product_section: true,
  products_per_section: 20,
  enable_testimonial_section: true,
};

const productLimits = [8, 12, 16, 20, 24];

export function HomePageSettingsContent() {
  const [form, setForm] = useState<HomePageSettingsForm>(defaults);
  const [initial, setInitial] = useState<HomePageSettingsForm>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    settingsApi.get<{ settings: HomePageSettingsForm }>("home-page")
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
    try {
      setSaving(true);
      const response = await settingsApi.update<HomePageSettingsForm, { settings: HomePageSettingsForm }>("home-page", form);
      const next = normalize(response.data.settings);
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
        description="Control home page product and customer testimonial sections without changing code."
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
                checked={form.enable_product_section}
                onChange={(enable_product_section) => setForm((current) => ({ ...current, enable_product_section }))}
              />
              <SelectInput
                label="Products Per Section"
                value={String(form.products_per_section)}
                options={productLimits.map((value) => ({ label: `${value} products`, value: String(value) }))}
                onChange={(value) => setForm((current) => ({ ...current, products_per_section: Number(value) }))}
              />
            </FormGrid>
          </SettingsSection>

          <SettingsSection title="Customer Testimonials" description="Control the What Our Customers Say section on the home page." icon={Star}>
            <FormGrid>
              <ToggleSwitch
                label="Enable Customer Testimonial Section"
                description="OFF removes the testimonial section and avoids loading review cards."
                checked={form.enable_testimonial_section}
                onChange={(enable_testimonial_section) => setForm((current) => ({ ...current, enable_testimonial_section }))}
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
