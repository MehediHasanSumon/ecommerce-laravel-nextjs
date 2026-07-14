"use client";

import { usePathname } from "next/navigation";
import * as React from "react";
import {
  BadgeCheck,
  Building2,
  Contact,
  Globe2,
  ImageIcon,
  LockKeyhole,
  ReceiptText,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";
import { SettingsGrid, SettingsPageShell, SettingsSection, SettingsSubnav, FormGrid, TextInput, TextareaInput, SelectInput, ToggleSwitch, ImageDropzone, ResetConfirmation, FormActions, useUnsavedChanges } from "@/features/admin/settings/components/settings-primitives";
import { settingsNavItems } from "@/features/admin/settings/components/settings-navigation";
import { settingsApi } from "@/features/admin/settings/services/settings-service";
import { toast } from "sonner";

type CompanySettings = {
  company_name: string;
  company_short_name: string;
  company_tagline: string;
  company_description: string;
  company_email: string;
  company_phone: string;
  company_mobile: string;
  website: string;
  logo: string;
  dark_logo: string;
  favicon: string;
  login_page_logo: string;
  admin_logo: string;
  admin_favicon: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  trade_license: string;
  tin: string;
  bin: string;
  invoice_prefix: string;
  invoice_start: number;
  invoice_footer_text: string;
  invoice_terms: string;
  invoice_logo: string;
  invoice_signature: string;
  currency_id: string;
  currency_name: string;
  currency_code: string;
  currency_symbol: string;
  currency_position: "left" | "right";
  currency_precision: string;
  decimal_separator: string;
  thousands_separator: string;
  default_tax: string;
  support_email: string;
  support_phone: string;
  whatsapp_number: string;
  telegram: string;
  messenger: string;
  facebook: string;
  instagram: string;
  youtube: string;
  twitter: string;
  linkedin: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  enable_user_registration: boolean;
  require_email_verification: boolean;
  require_phone_verification: boolean;
  default_user_role: string;
  enable_login: boolean;
  enable_social_login: boolean;
  google_login: boolean;
  facebook_login: boolean;
  store_timezone: string;
  date_format: string;
  time_format: string;
  language: string;
  force_https: boolean;
  session_timeout: string;
  max_login_attempts: string;
  maintenance_mode: boolean;
  maintenance_message: string;
};

const defaultCompanySettings: CompanySettings = {
  company_name: "",
  company_short_name: "",
  company_tagline: "",
  company_description: "",
  company_email: "",
  company_phone: "",
  company_mobile: "",
  website: "",
  logo: "",
  dark_logo: "",
  favicon: "",
  login_page_logo: "",
  admin_logo: "",
  admin_favicon: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
  trade_license: "",
  tin: "",
  bin: "",
  invoice_prefix: "INV",
  invoice_start: 1000,
  invoice_footer_text: "",
  invoice_terms: "",
  invoice_logo: "",
  invoice_signature: "",
  currency_id: "",
  currency_name: "Bangladeshi Taka",
  currency_code: "BDT",
  currency_symbol: "৳",
  currency_position: "left",
  currency_precision: "2",
  decimal_separator: ".",
  thousands_separator: ",",
  default_tax: "0.00",
  support_email: "",
  support_phone: "",
  whatsapp_number: "",
  telegram: "",
  messenger: "",
  facebook: "",
  instagram: "",
  youtube: "",
  twitter: "",
  linkedin: "",
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  enable_user_registration: true,
  require_email_verification: true,
  require_phone_verification: false,
  default_user_role: "customer",
  enable_login: true,
  enable_social_login: true,
  google_login: true,
  facebook_login: false,
  store_timezone: "Asia/Dhaka",
  date_format: "d M Y",
  time_format: "12h",
  language: "en",
  force_https: true,
  session_timeout: "120",
  max_login_attempts: "5",
  maintenance_mode: false,
  maintenance_message: "",
};

export function CompanySettingsContent() {
  const pathname = usePathname();
  const [values, setValues] = React.useState<CompanySettings>(defaultCompanySettings);
  const [initial, setInitial] = React.useState<CompanySettings>(defaultCompanySettings);
  const [currencies, setCurrencies] = React.useState<Array<{ id: number; name: string; currency: string; symbol: string; status: string }>>([]);
  const [saving, setSaving] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  const errors = {
    company_name: values.company_name.trim() ? "" : "Company name is required.",
    company_email: values.company_email && !values.company_email.includes("@") ? "Enter a valid email address." : "",
    currency_id: values.currency_id ? "" : "Currency is required.",
  };

  useUnsavedChanges(isDirty);

  React.useEffect(() => {
    let active = true;

    settingsApi.get<{ settings: Record<string, unknown>; currencies: Array<{ id: number; name: string; currency: string; symbol: string; status: string }> }>("company")
      .then((response) => {
        if (!active) return;
        const settings = mapCompanySettings(response.data.settings);
        setCurrencies(response.data.currencies ?? []);
        setValues(settings);
        setInitial(settings);
      })
      .catch(() => toast.error("Could not load company settings."));

    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    settingsApi.update<Record<string, unknown>, { settings: Record<string, unknown> }>("company", toCompanySettingsPayload(values))
      .then((response) => {
        const settings = mapCompanySettings(response.data.settings);
        setValues(settings);
        setInitial(settings);
        toast.success("Settings saved successfully.");
      })
      .catch(() => toast.error("Could not save company settings."))
      .finally(() => setSaving(false));
  }

  return (
    <form onSubmit={submit}>
      <SettingsPageShell
        title="Company Settings"
        description="Manage business identity, branding, invoice defaults, contact channels, authentication, localization, security, SEO, and maintenance controls."
        icon={Building2}
        actions={<FormActions isSaving={saving} isDirty={isDirty} onReset={() => setResetOpen(true)} />}
      >
        <SettingsGrid>
          <SettingsSubnav items={settingsNavItems} pathname={pathname} />
          <div className="space-y-5">
            <SettingsSection title="Basic Information" description="Public business identity used across invoices, storefront metadata, and admin surfaces." icon={Store}>
              <FormGrid>
                <TextInput label="Company Name" required value={values.company_name} error={errors.company_name} onChange={(event) => update("company_name", event.target.value)} />
                <TextInput label="Company Short Name" value={values.company_short_name} onChange={(event) => update("company_short_name", event.target.value)} />
                <TextInput label="Company Tagline" value={values.company_tagline} onChange={(event) => update("company_tagline", event.target.value)} />
                <TextInput label="Website" value={values.website} onChange={(event) => update("website", event.target.value)} />
              </FormGrid>
              <div className="mt-4">
                <TextareaInput label="Company Description" value={values.company_description} onChange={(event) => update("company_description", event.target.value)} />
              </div>
            </SettingsSection>

            <SettingsSection title="Contact & Address" description="Customer support and registered office information." icon={Contact}>
              <FormGrid>
                <TextInput label="Company Email" value={values.company_email} error={errors.company_email} onChange={(event) => update("company_email", event.target.value)} />
                <TextInput label="Support Email" value={values.support_email} onChange={(event) => update("support_email", event.target.value)} />
                <TextInput label="Company Phone" value={values.company_phone} onChange={(event) => update("company_phone", event.target.value)} />
                <TextInput label="Support Phone" value={values.support_phone} onChange={(event) => update("support_phone", event.target.value)} />
                <TextInput label="Company Mobile" value={values.company_mobile} onChange={(event) => update("company_mobile", event.target.value)} />
                <TextInput label="WhatsApp Number" value={values.whatsapp_number} onChange={(event) => update("whatsapp_number", event.target.value)} />
                <TextInput label="Telegram" value={values.telegram} onChange={(event) => update("telegram", event.target.value)} />
                <TextInput label="Messenger" value={values.messenger} onChange={(event) => update("messenger", event.target.value)} />
              </FormGrid>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextareaInput label="Address" value={values.address} onChange={(event) => update("address", event.target.value)} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput label="City" value={values.city} onChange={(event) => update("city", event.target.value)} />
                  <TextInput label="State" value={values.state} onChange={(event) => update("state", event.target.value)} />
                  <TextInput label="Postal Code" value={values.postal_code} onChange={(event) => update("postal_code", event.target.value)} />
                  <TextInput label="Country" value={values.country} onChange={(event) => update("country", event.target.value)} />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Branding Assets" description="Upload light, dark, admin, login, favicon, invoice, and signature assets." icon={ImageIcon}>
              <div className="grid gap-4 lg:grid-cols-3">
                <ImageDropzone label="Logo" value={values.logo} onChange={(value) => update("logo", value)} />
                <ImageDropzone label="Dark Logo" value={values.dark_logo} onChange={(value) => update("dark_logo", value)} />
                <ImageDropzone label="Favicon" value={values.favicon} onChange={(value) => update("favicon", value)} />
                <ImageDropzone label="Login Page Logo" value={values.login_page_logo} onChange={(value) => update("login_page_logo", value)} />
                <ImageDropzone label="Admin Logo" value={values.admin_logo} onChange={(value) => update("admin_logo", value)} />
                <ImageDropzone label="Admin Favicon" value={values.admin_favicon} onChange={(value) => update("admin_favicon", value)} />
                <ImageDropzone label="Invoice Logo" value={values.invoice_logo} onChange={(value) => update("invoice_logo", value)} />
                <ImageDropzone label="Invoice Signature" value={values.invoice_signature} onChange={(value) => update("invoice_signature", value)} />
              </div>
            </SettingsSection>

            <SettingsSection title="Business Registration" description="Commercial identifiers used by finance, invoice, and compliance workflows." icon={BadgeCheck}>
              <FormGrid>
                <TextInput label="Trade License" value={values.trade_license} onChange={(event) => update("trade_license", event.target.value)} />
                <TextInput label="TIN" value={values.tin} onChange={(event) => update("tin", event.target.value)} />
                <TextInput label="BIN" value={values.bin} onChange={(event) => update("bin", event.target.value)} />
                <TextInput label="Default Tax (%)" type="number" step="0.01" value={values.default_tax} onChange={(event) => update("default_tax", event.target.value)} />
              </FormGrid>
            </SettingsSection>

            <SettingsSection title="Invoice & Currency" description="Invoice numbering, footer text, currency formatting, and commercial terms." icon={ReceiptText}>
              <FormGrid>
                <TextInput label="Invoice Prefix" required value={values.invoice_prefix} onChange={(event) => update("invoice_prefix", event.target.value)} />
                <TextInput label="Invoice Start" type="number" value={values.invoice_start} onChange={(event) => update("invoice_start", Number(event.target.value))} />
                <SelectInput
                  label="Currency"
                  value={values.currency_id}
                  options={currencies.filter((currency) => currency.status === "active" || String(currency.id) === values.currency_id).map((currency) => ({ label: currency.name, value: String(currency.id) }))}
                  onChange={(value) => {
                    const selected = currencies.find((currency) => String(currency.id) === value);
                    update("currency_id", value);
                    if (selected) {
                      setValues((current) => ({
                        ...current,
                        currency_id: value,
                        currency_code: selected.currency,
                        currency_symbol: selected.symbol,
                        currency_name: selected.name,
                      }));
                    }
                  }}
                />
                <SelectInput label="Currency Position" value={values.currency_position} options={[{ label: "Left", value: "left" }, { label: "Right", value: "right" }]} onChange={(value) => update("currency_position", value as CompanySettings["currency_position"])} />
                <TextInput label="Currency Precision" type="number" value={values.currency_precision} onChange={(event) => update("currency_precision", event.target.value)} />
              </FormGrid>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextareaInput label="Invoice Footer Text" value={values.invoice_footer_text} onChange={(event) => update("invoice_footer_text", event.target.value)} />
                <TextareaInput label="Invoice Terms" value={values.invoice_terms} onChange={(event) => update("invoice_terms", event.target.value)} />
              </div>
            </SettingsSection>

            <SettingsSection title="Registration & Authentication" description="Control account creation, login availability, verification policy, and social providers." icon={LockKeyhole}>
              <div className="grid gap-3 md:grid-cols-2">
                <ToggleSwitch label="Enable User Registration" checked={values.enable_user_registration} onChange={(checked) => update("enable_user_registration", checked)} />
                <ToggleSwitch label="Require Email Verification" checked={values.require_email_verification} onChange={(checked) => update("require_email_verification", checked)} />
                <ToggleSwitch label="Require Phone Verification" checked={values.require_phone_verification} onChange={(checked) => update("require_phone_verification", checked)} />
                <ToggleSwitch label="Enable Login" checked={values.enable_login} onChange={(checked) => update("enable_login", checked)} />
                <ToggleSwitch label="Enable Social Login" checked={values.enable_social_login} onChange={(checked) => update("enable_social_login", checked)} />
                <ToggleSwitch label="Google Login" checked={values.google_login} onChange={(checked) => update("google_login", checked)} />
                <ToggleSwitch label="Facebook Login" checked={values.facebook_login} onChange={(checked) => update("facebook_login", checked)} />
                <SelectInput label="Default User Role" value={values.default_user_role} options={[{ label: "Customer", value: "customer" }, { label: "Subscriber", value: "subscriber" }, { label: "Wholesale", value: "wholesale" }]} onChange={(value) => update("default_user_role", value)} />
              </div>
            </SettingsSection>

            <SettingsSection title="Store Localization" description="Regional behavior for timezone, date/time display, language, and currency precision." icon={Globe2}>
              <FormGrid>
                <SelectInput label="Store Timezone" value={values.store_timezone} options={[{ label: "Asia/Dhaka", value: "Asia/Dhaka" }, { label: "UTC", value: "UTC" }, { label: "America/New_York", value: "America/New_York" }]} onChange={(value) => update("store_timezone", value)} />
                <SelectInput label="Date Format" value={values.date_format} options={[{ label: "02 Jul 2026", value: "d M Y" }, { label: "2026-07-02", value: "Y-m-d" }, { label: "07/02/2026", value: "m/d/Y" }]} onChange={(value) => update("date_format", value)} />
                <SelectInput label="Time Format" value={values.time_format} options={[{ label: "12 hour", value: "12h" }, { label: "24 hour", value: "24h" }]} onChange={(value) => update("time_format", value)} />
                <SelectInput label="Language" value={values.language} options={[{ label: "English", value: "en" }, { label: "Bangla", value: "bn" }]} onChange={(value) => update("language", value)} />
              </FormGrid>
            </SettingsSection>

            <SettingsSection title="Social Links & SEO" description="Default search metadata and official social channels." icon={Search}>
              <FormGrid>
                <TextInput label="Facebook" value={values.facebook} onChange={(event) => update("facebook", event.target.value)} />
                <TextInput label="Instagram" value={values.instagram} onChange={(event) => update("instagram", event.target.value)} />
                <TextInput label="YouTube" value={values.youtube} onChange={(event) => update("youtube", event.target.value)} />
                <TextInput label="Twitter / X" value={values.twitter} onChange={(event) => update("twitter", event.target.value)} />
                <TextInput label="LinkedIn" value={values.linkedin} onChange={(event) => update("linkedin", event.target.value)} />
                <TextInput label="Meta Title" value={values.meta_title} onChange={(event) => update("meta_title", event.target.value)} />
              </FormGrid>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextareaInput label="Meta Description" value={values.meta_description} onChange={(event) => update("meta_description", event.target.value)} />
                <TextareaInput label="Meta Keywords" value={values.meta_keywords} onChange={(event) => update("meta_keywords", event.target.value)} />
              </div>
            </SettingsSection>

            <SettingsSection title="Security & Maintenance" description="Operational safeguards for sessions, HTTPS, login attempts, and maintenance mode." icon={ShieldCheck}>
              <div className="grid gap-3 md:grid-cols-2">
                <ToggleSwitch label="Force HTTPS" checked={values.force_https} onChange={(checked) => update("force_https", checked)} />
                <ToggleSwitch label="Maintenance Mode" checked={values.maintenance_mode} onChange={(checked) => update("maintenance_mode", checked)} />
                <TextInput label="Session Timeout (minutes)" type="number" value={values.session_timeout} onChange={(event) => update("session_timeout", event.target.value)} />
                <TextInput label="Max Login Attempts" type="number" value={values.max_login_attempts} onChange={(event) => update("max_login_attempts", event.target.value)} />
              </div>
              <div className="mt-4">
                <TextareaInput label="Maintenance Message" value={values.maintenance_message} onChange={(event) => update("maintenance_message", event.target.value)} />
              </div>
            </SettingsSection>
          </div>
        </SettingsGrid>
      </SettingsPageShell>
      <ResetConfirmation open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={() => { setValues(defaultCompanySettings); setResetOpen(false); }} />
    </form>
  );
}

function mapCompanySettings(record: Record<string, unknown>): CompanySettings {
  return {
    ...defaultCompanySettings,
    company_name: stringValue(record.company_name, defaultCompanySettings.company_name),
    company_email: stringValue(record.company_email, defaultCompanySettings.company_email),
    company_phone: stringValue(record.company_phone, defaultCompanySettings.company_phone),
    support_email: stringValue(record.support_email, defaultCompanySettings.support_email),
    support_phone: stringValue(record.support_phone, defaultCompanySettings.support_phone),
    logo: stringValue(record.logo, defaultCompanySettings.logo),
    dark_logo: stringValue(record.dark_logo, defaultCompanySettings.dark_logo),
    favicon: stringValue(record.favicon, defaultCompanySettings.favicon),
    invoice_logo: stringValue(record.invoice_logo, defaultCompanySettings.invoice_logo),
    country: stringValue(record.country, defaultCompanySettings.country),
    state: stringValue(record.state, defaultCompanySettings.state),
    city: stringValue(record.city, defaultCompanySettings.city),
    postal_code: stringValue(record.postal_code, defaultCompanySettings.postal_code),
    address: stringValue(record.full_address, defaultCompanySettings.address),
    trade_license: stringValue(record.trade_license, defaultCompanySettings.trade_license),
    invoice_prefix: stringValue(record.invoice_prefix, defaultCompanySettings.invoice_prefix),
    invoice_footer_text: stringValue(record.invoice_footer, defaultCompanySettings.invoice_footer_text),
    invoice_terms: stringValue(record.invoice_terms, defaultCompanySettings.invoice_terms),
    currency_id: String(record.currency_id ?? (record.currency_record as { id?: number } | null)?.id ?? ""),
    currency_name: stringValue((record.currency_record as { country?: string } | null)?.country, defaultCompanySettings.currency_name),
    currency_code: stringValue(record.default_currency ?? record.currency_code, defaultCompanySettings.currency_code),
    currency_symbol: stringValue(record.currency_symbol, defaultCompanySettings.currency_symbol),
    currency_position: record.currency_position === "right" ? "right" : "left",
    currency_precision: String(record.decimal_places ?? record.currency_precision ?? defaultCompanySettings.currency_precision),
    decimal_separator: stringValue(record.decimal_separator, defaultCompanySettings.decimal_separator),
    thousands_separator: stringValue(record.thousands_separator, defaultCompanySettings.thousands_separator),
    store_timezone: stringValue(record.timezone, defaultCompanySettings.store_timezone),
    date_format: stringValue(record.date_format, defaultCompanySettings.date_format),
    time_format: record.time_format === "24h" ? "24h" : "12h",
  };
}

function toCompanySettingsPayload(values: CompanySettings): Record<string, unknown> {
  return {
    company_name: values.company_name,
    legal_company_name: values.company_name,
    company_email: values.company_email || null,
    company_phone: values.company_phone || null,
    support_email: values.support_email || null,
    support_phone: values.support_phone || null,
    logo: values.logo || null,
    dark_logo: values.dark_logo || null,
    favicon: values.favicon || null,
    invoice_logo: values.invoice_logo || null,
    country: values.country || null,
    state: values.state || null,
    city: values.city || null,
    postal_code: values.postal_code || null,
    full_address: values.address || null,
    tax_number: values.tin || null,
    trade_license: values.trade_license || null,
    currency_id: Number(values.currency_id),
    currency_position: values.currency_position,
    decimal_places: Number(values.currency_precision || 2),
    decimal_separator: values.decimal_separator || ".",
    thousands_separator: values.thousands_separator || ",",
    timezone: values.store_timezone,
    date_format: values.date_format,
    time_format: values.time_format,
    invoice_prefix: values.invoice_prefix,
    invoice_footer: values.invoice_footer_text || null,
    invoice_terms: values.invoice_terms || null,
    company_active: true,
  };
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}
