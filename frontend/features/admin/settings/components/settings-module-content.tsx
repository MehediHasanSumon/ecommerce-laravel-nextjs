"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CreditCard,
  Globe2,
  ImageIcon,
  Link2,
  Mail,
  MapPin,
  MessageSquareText,
  PackageCheck,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Store,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { settingsNavItems } from "@/features/admin/settings/components/settings-navigation";
import {
  FormActions,
  FormGrid,
  ImageDropzone,
  ResetConfirmation,
  SelectInput,
  SettingsGrid,
  SettingsPageShell,
  SettingsSection,
  SettingsSubnav,
  StatusPill,
  TextareaInput,
  TextInput,
  ToggleSwitch,
  useUnsavedChanges,
} from "@/features/admin/settings/components/settings-primitives";
import { settingsApi } from "@/features/admin/settings/services/settings-service";
import { SettingsSectionSkeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";

type FieldType = "text" | "email" | "url" | "number" | "password" | "textarea" | "select" | "toggle" | "image" | "date";
type SettingValue = string | number | boolean | null | undefined | string[] | Record<string, unknown> | Array<Record<string, unknown>>;
type Values = Record<string, SettingValue>;

type CurrencyRecord = {
  id: number;
  name?: string;
  country: string;
  currency: string;
  symbol: string;
  status: string;
};

type Field = {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  helper?: string;
  uploadPath?: string;
};

type SmsProviderRow = {
  provider: string;
  api_key: string;
  api_secret: string;
  sender_id: string;
  base_url: string;
  is_default: boolean;
  status: boolean;
};

type PaymentGatewayRow = {
  gateway: string;
  enabled: boolean;
  sandbox_mode: boolean;
  public_key: string;
  secret_key: string;
  api_key: string;
  merchant_id: string;
  webhook_secret: string;
  additional_configuration: Record<string, unknown>;
  display_order: number;
};

function gatewayConfigValue(row: PaymentGatewayRow, key: string) {
  const value = row.additional_configuration?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

type SocialMediaRow = {
  platform: string;
  url: string;
  icon: string;
  display_order: number;
  open_in_new_tab: boolean;
  status: boolean;
};

type Section = {
  title: string;
  description: string;
  icon: LucideIcon;
  fields: Field[];
};

type SingletonModule = {
  kind: "singleton";
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  defaults: Values;
  sections: Section[];
  testPath?: string;
  testLabel?: string;
};

const currencyOptions = [
  { label: "BDT", value: "BDT" },
  { label: "USD", value: "USD" },
  { label: "EUR", value: "EUR" },
];

const timezoneOptions = [
  { label: "Asia/Dhaka", value: "Asia/Dhaka" },
  { label: "UTC", value: "UTC" },
  { label: "America/New_York", value: "America/New_York" },
  { label: "Europe/London", value: "Europe/London" },
];

const smsProviderLabels: Record<string, string> = { twilio: "Twilio", vonage: "Vonage", ssl_wireless: "SSL Wireless", custom: "Custom Provider" };
const paymentGatewayLabels: Record<string, string> = { stripe: "Stripe", sslcommerz: "SSLCommerz", bkash: "bKash", nagad: "Nagad", rocket: "Rocket", paypal: "PayPal", aamarpay: "aamarPay", cash_on_delivery: "Cash On Delivery" };
const offlinePaymentGateways = new Set(["cash_on_delivery"]);

const yesNo = [
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
];

const moduleConfigs: Record<string, SingletonModule> = {
  company: {
    kind: "singleton",
    path: "company",
    title: "Company Settings",
    description: "Manage legal identity, branding, address, invoice defaults, and business status.",
    icon: Building2,
    defaults: {
      company_name: "",
      legal_company_name: "",
      company_email: "",
      company_phone: "",
      support_email: "",
      support_phone: "",
      logo: "",
      dark_logo: "",
      favicon: "",
      invoice_logo: "",
      country: "",
      state: "",
      city: "",
      postal_code: "",
      full_address: "",
      tax_number: "",
      trade_license: "",
      currency_id: "",
      currency_position: "left",
      timezone: "Asia/Dhaka",
      date_format: "d M Y",
      time_format: "12h",
      invoice_prefix: "INV",
      invoice_footer: "",
      invoice_terms: "",
      company_active: true,
    },
    sections: [
      { title: "Basic Information", description: "Business identity and primary contact details.", icon: Store, fields: [
        { name: "company_name", label: "Company Name", required: true },
        { name: "legal_company_name", label: "Legal Company Name" },
        { name: "company_email", label: "Company Email", type: "email" },
        { name: "company_phone", label: "Company Phone" },
        { name: "support_email", label: "Support Email", type: "email" },
        { name: "support_phone", label: "Support Phone" },
      ] },
      { title: "Branding", description: "Logo assets used across storefront, admin, and invoices.", icon: ImageIcon, fields: [
        { name: "logo", label: "Logo", type: "image", uploadPath: "company" },
        { name: "dark_logo", label: "Dark Logo", type: "image", uploadPath: "company" },
        { name: "favicon", label: "Favicon", type: "image", uploadPath: "company" },
        { name: "invoice_logo", label: "Invoice Logo", type: "image", uploadPath: "company" },
      ] },
      { title: "Address", description: "Registered address shown on invoices and business documents.", icon: MapPin, fields: [
        { name: "country", label: "Country" },
        { name: "state", label: "State" },
        { name: "city", label: "City" },
        { name: "postal_code", label: "Postal Code" },
        { name: "full_address", label: "Full Address", type: "textarea" },
      ] },
      { title: "Business & Invoice", description: "Currency, timezone, registration, and invoice terms.", icon: PackageCheck, fields: [
        { name: "tax_number", label: "Tax Number" },
        { name: "trade_license", label: "Trade License" },
        { name: "currency_id", label: "Default Currency", type: "select", required: true, options: [] },
        { name: "currency_position", label: "Currency Position", type: "select", required: true, options: yesNo },
        { name: "timezone", label: "Timezone", type: "select", required: true, options: timezoneOptions },
        { name: "date_format", label: "Date Format", required: true },
        { name: "time_format", label: "Time Format", type: "select", required: true, options: [{ label: "12 hour", value: "12h" }, { label: "24 hour", value: "24h" }] },
        { name: "invoice_prefix", label: "Invoice Prefix", required: true },
        { name: "invoice_footer", label: "Invoice Footer", type: "textarea" },
        { name: "invoice_terms", label: "Invoice Terms", type: "textarea" },
        { name: "company_active", label: "Company Active", type: "toggle" },
      ] },
    ],
  },
  "home-feature-cards": {
    kind: "singleton",
    path: "home-feature-cards",
    title: "Home Page Feature Cards",
    description: "Control whether the service highlight cards render below the hero section.",
    icon: BadgeCheck,
    defaults: {
      enabled: true,
    },
    sections: [
      { title: "Section Visibility", description: "Toggle the full feature-card section on the storefront.", icon: BadgeCheck, fields: [
        { name: "enabled", label: "Enable Feature Cards Section", type: "toggle" },
      ] },
    ],
  },
  store: {
    kind: "singleton",
    path: "store",
    title: "Store Settings",
    description: "Configure storefront identity, catalog behavior, checkout rules, and inventory policies.",
    icon: Store,
    defaults: {
      store_name: "",
      store_url: "",
      store_email: "",
      store_phone: "",
      products_per_page: 24,
      default_product_sorting: "latest",
      default_product_view: "grid",
      enable_reviews: true,
      enable_wishlist: true,
      enable_compare: false,
      enable_stock_management: true,
      enable_guest_checkout: true,
      require_login_before_checkout: false,
      minimum_order_amount_cents: 0,
      maximum_order_amount_cents: "",
      low_stock_threshold: 5,
      allow_backorders: false,
      hide_out_of_stock_products: false,
    },
    sections: [
      { title: "Store Information", description: "Public storefront contact and URL details.", icon: Store, fields: [
        { name: "store_name", label: "Store Name", required: true },
        { name: "store_url", label: "Store URL", type: "url" },
        { name: "store_email", label: "Store Email", type: "email" },
        { name: "store_phone", label: "Store Phone" },
      ] },
      { title: "Catalog", description: "Product browsing defaults and merchandising features.", icon: PackageCheck, fields: [
        { name: "products_per_page", label: "Products Per Page", type: "number", required: true },
        { name: "default_product_sorting", label: "Default Product Sorting", type: "select", options: [
          { label: "Latest", value: "latest" }, { label: "Oldest", value: "oldest" }, { label: "Price Low", value: "price_low" }, { label: "Price High", value: "price_high" }, { label: "Name A-Z", value: "name_asc" }, { label: "Name Z-A", value: "name_desc" },
        ] },
        { name: "default_product_view", label: "Default Product View", type: "select", options: [{ label: "Grid", value: "grid" }, { label: "List", value: "list" }] },
        { name: "enable_reviews", label: "Enable Reviews", type: "toggle" },
        { name: "enable_wishlist", label: "Enable Wishlist", type: "toggle" },
        { name: "enable_compare", label: "Enable Compare", type: "toggle" },
        { name: "enable_stock_management", label: "Enable Stock Management", type: "toggle" },
      ] },
      { title: "Checkout & Inventory", description: "Order limits and inventory handling rules.", icon: ShieldAlert, fields: [
        { name: "enable_guest_checkout", label: "Enable Guest Checkout", type: "toggle" },
        { name: "require_login_before_checkout", label: "Require Login Before Checkout", type: "toggle" },
        { name: "minimum_order_amount_cents", label: "Minimum Order Amount (cents)", type: "number", required: true },
        { name: "maximum_order_amount_cents", label: "Maximum Order Amount (cents)", type: "number" },
        { name: "low_stock_threshold", label: "Low Stock Threshold", type: "number", required: true },
        { name: "allow_backorders", label: "Allow Backorders", type: "toggle" },
        { name: "hide_out_of_stock_products", label: "Hide Out-of-Stock Products", type: "toggle" },
      ] },
    ],
  },
  email: {
    kind: "singleton",
    path: "email",
    title: "Email (SMTP)",
    description: "Configure outbound email transport, sender identity, queueing, and test delivery.",
    icon: Mail,
    testPath: "email",
    testLabel: "Send Test Email",
    defaults: {
      mail_driver: "smtp",
      mail_host: "",
      mail_port: 587,
      encryption: "tls",
      username: "",
      password: "",
      from_name: "",
      from_email: "",
      reply_to_email: "",
      queue_emails: true,
      enabled: true,
    },
    sections: [
      { title: "Configuration", description: "Driver, server, credentials, and transport encryption.", icon: Mail, fields: [
        { name: "enabled", label: "Enable Email Delivery", type: "toggle" },
        { name: "mail_driver", label: "Mail Driver", type: "select", required: true, options: [{ label: "SMTP", value: "smtp" }, { label: "Sendmail", value: "sendmail" }, { label: "Log", value: "log" }] },
        { name: "mail_host", label: "Mail Host" },
        { name: "mail_port", label: "SMTP Port", type: "number", required: true },
        { name: "encryption", label: "Encryption", type: "select", required: true, options: [{ label: "TLS", value: "tls" }, { label: "SSL", value: "ssl" }, { label: "None", value: "none" }] },
        { name: "username", label: "Username" },
        { name: "password", label: "Password", type: "password" },
        { name: "queue_emails", label: "Queue Emails", type: "toggle" },
      ] },
      { title: "Sender Identity", description: "Default sender and reply-to details.", icon: Send, fields: [
        { name: "from_name", label: "From Name", required: true },
        { name: "from_email", label: "From Email", type: "email", required: true },
        { name: "reply_to_email", label: "Reply-To Email", type: "email" },
      ] },
    ],
  },
  seo: {
    kind: "singleton",
    path: "seo",
    title: "SEO Settings",
    description: "Control global metadata, robots behavior, sitemap, social previews, and analytics identifiers.",
    icon: Search,
    defaults: {
      site_title: "",
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      canonical_url: "",
      robots_index: true,
      robots_follow: true,
      robots_archive: true,
      enable_sitemap: true,
      sitemap_url: "",
      og_title: "",
      og_description: "",
      og_image: "",
      twitter_card_type: "summary_large_image",
      twitter_title: "",
      twitter_description: "",
      twitter_image: "",
      google_analytics_id: "",
      google_tag_manager_id: "",
      facebook_pixel_id: "",
    },
    sections: [
      { title: "Global SEO", description: "Default search metadata and canonical URL.", icon: Search, fields: [
        { name: "site_title", label: "Site Title" },
        { name: "meta_title", label: "Meta Title" },
        { name: "canonical_url", label: "Canonical URL", type: "url" },
        { name: "meta_description", label: "Meta Description", type: "textarea" },
        { name: "meta_keywords", label: "Meta Keywords", type: "textarea" },
      ] },
      { title: "Robots & Sitemap", description: "Search crawling and sitemap publication controls.", icon: ShieldAlert, fields: [
        { name: "robots_index", label: "Allow Indexing", type: "toggle" },
        { name: "robots_follow", label: "Allow Follow", type: "toggle" },
        { name: "robots_archive", label: "Allow Archive", type: "toggle" },
        { name: "enable_sitemap", label: "Enable Sitemap", type: "toggle" },
        { name: "sitemap_url", label: "Sitemap URL", type: "url" },
      ] },
      { title: "Social Preview & Analytics", description: "Open Graph, Twitter Card, and analytics identifiers.", icon: Link2, fields: [
        { name: "og_title", label: "OG Title" },
        { name: "og_description", label: "OG Description", type: "textarea" },
        { name: "og_image", label: "OG Image", type: "image", uploadPath: "seo" },
        { name: "twitter_card_type", label: "Twitter Card Type", type: "select", options: [{ label: "Summary", value: "summary" }, { label: "Large Image", value: "summary_large_image" }, { label: "App", value: "app" }, { label: "Player", value: "player" }] },
        { name: "twitter_title", label: "Twitter Title" },
        { name: "twitter_description", label: "Twitter Description", type: "textarea" },
        { name: "twitter_image", label: "Twitter Image", type: "image", uploadPath: "seo" },
        { name: "google_analytics_id", label: "Google Analytics ID" },
        { name: "google_tag_manager_id", label: "Google Tag Manager ID" },
        { name: "facebook_pixel_id", label: "Facebook Pixel ID" },
      ] },
    ],
  },
  localization: {
    kind: "singleton",
    path: "localization",
    title: "Localization",
    description: "Set language, currency, timezone, number formatting, and RTL behavior.",
    icon: Globe2,
    defaults: {
      default_language: "en",
      default_currency: "BDT",
      timezone: "Asia/Dhaka",
      date_format: "d M Y",
      time_format: "12h",
      first_day_of_week: 0,
      rtl_mode: false,
      decimal_separator: ".",
      thousand_separator: ",",
    },
    sections: [
      { title: "Regional Defaults", description: "Language, currency, calendar, and clock preferences.", icon: Globe2, fields: [
        { name: "default_language", label: "Default Language", type: "select", options: [{ label: "English", value: "en" }, { label: "Bangla", value: "bn" }, { label: "Arabic", value: "ar" }] },
        { name: "default_currency", label: "Default Currency", type: "select", options: currencyOptions },
        { name: "timezone", label: "Timezone", type: "select", options: timezoneOptions },
        { name: "date_format", label: "Date Format" },
        { name: "time_format", label: "Time Format", type: "select", options: [{ label: "12 hour", value: "12h" }, { label: "24 hour", value: "24h" }] },
        { name: "first_day_of_week", label: "First Day of Week", type: "select", options: [
          { label: "Sunday", value: "0" }, { label: "Monday", value: "1" }, { label: "Tuesday", value: "2" }, { label: "Wednesday", value: "3" }, { label: "Thursday", value: "4" }, { label: "Friday", value: "5" }, { label: "Saturday", value: "6" },
        ] },
        { name: "rtl_mode", label: "RTL Mode", type: "toggle" },
        { name: "decimal_separator", label: "Decimal Separator" },
        { name: "thousand_separator", label: "Thousand Separator" },
      ] },
    ],
  },
  maintenance: {
    kind: "singleton",
    path: "maintenance",
    title: "Maintenance Mode",
    description: "Control storefront downtime messaging, admin access, retry hints, and allowed IPs.",
    icon: ShieldAlert,
    defaults: {
      enabled: false,
      title: "Maintenance in progress",
      message: "",
      estimated_return_time: "",
      allow_admin_access: true,
      allowed_ip_addresses_text: "",
      retry_after: 3600,
      maintenance_image: "",
    },
    sections: [
      { title: "Downtime Controls", description: "Maintenance status, public message, and estimated return time.", icon: ShieldAlert, fields: [
        { name: "enabled", label: "Enable Maintenance Mode", type: "toggle" },
        { name: "allow_admin_access", label: "Allow Admin Access", type: "toggle" },
        { name: "title", label: "Maintenance Title", required: true },
        { name: "estimated_return_time", label: "Estimated Return Time", type: "date" },
        { name: "retry_after", label: "Retry After (seconds)", type: "number", required: true },
        { name: "allowed_ip_addresses_text", label: "Allowed IP Addresses", type: "textarea", helper: "One IP address per line." },
        { name: "message", label: "Maintenance Message", type: "textarea" },
        { name: "maintenance_image", label: "Maintenance Image", type: "image", uploadPath: "maintenance" },
      ] },
    ],
  },
};

const settingEditPermissions: Record<string, string> = {
  company: "can_edit_company_setting",
  store: "can_edit_store_setting",
  email: "can_edit_email_setting",
  seo: "can_edit_seo_setting",
  localization: "can_edit_localization_setting",
  maintenance: "can_edit_maintenance_setting",
};

export function SettingsModuleContent({ module }: { module: keyof typeof moduleConfigs }) {
  const config = moduleConfigs[module];
  const pathname = usePathname();
  const [values, setValues] = React.useState<Values>(config.defaults);
  const [initial, setInitial] = React.useState<Values>(config.defaults);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [companyCurrencyOptions, setCompanyCurrencyOptions] = React.useState<Array<{ label: string; value: string }>>([]);
  useAuthStore((state) => state.user?.permissions);
  const canEdit = hasPermission(settingEditPermissions[module] ?? "");
  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  const sections = React.useMemo(() => {
    if (module !== "company") return config.sections;

    return config.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => (
        field.name === "currency_id"
          ? { ...field, options: companyCurrencyOptions }
          : field
      )),
    }));
  }, [companyCurrencyOptions, config.sections, module]);

  useUnsavedChanges(isDirty);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    settingsApi.get<{ settings: Values; currencies?: CurrencyRecord[] }>(config.path)
      .then((response) => {
        if (!active) return;
        if (module === "company") {
          setCompanyCurrencyOptions((response.data.currencies ?? []).map((currency) => ({
            label: currency.name ?? `${currency.country} (${currency.currency} ${currency.symbol})`,
            value: String(currency.id),
          })));
        }
        const next = normalizeIncoming(module, { ...config.defaults, ...(response.data.settings ?? {}) });
        setValues(next);
        setInitial(next);
      })
      .catch(() => toast.error(`Could not load ${config.title.toLowerCase()}.`))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [config, module]);

  function update(name: string, value: SettingValue) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    const nextErrors = validateFields(sections, values);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      setSaving(true);
      const payload = normalizeOutgoing(module, values);
      const response = await settingsApi.update<Values, { settings: Values }>(config.path, payload);
      const next = normalizeIncoming(module, { ...config.defaults, ...(response.data.settings ?? payload) });
      setValues(next);
      setInitial(next);
      toast.success(response.message || "Settings saved successfully.");
    } catch (error: unknown) {
      const apiError = getApiError(error);
      setErrors(flattenErrors(apiError.errors));
      toast.error(apiError.message || "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function runTest() {
    if (!config.testPath || !canEdit) return;
    try {
      setTesting(true);
      const response = await settingsApi.test(config.testPath);
      toast.success(response.message || "Test queued successfully.");
    } catch (error: unknown) {
      toast.error(getApiError(error).message || "Test failed.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <SettingsPageShell
        title={config.title}
        description={config.description}
        icon={config.icon}
        actions={canEdit ? <FormActions isSaving={saving} isDirty={isDirty} onReset={() => setResetOpen(true)} /> : null}
      >
        <SettingsGrid>
          <SettingsSubnav items={settingsNavItems} pathname={pathname} />
          <div className="space-y-4">
            {loading ? <SettingsLoading /> : null}
            {!loading && config.testPath ? (
              <SettingsSection title="Connection Status" description="Use the saved configuration to run a backend test action." icon={Send}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <StatusPill ok={Boolean(values.enabled)} label={values.enabled ? "Enabled" : "Disabled"} />
                  {canEdit ? <Button type="button" variant="secondary" isLoading={testing} icon={<Send className="h-4 w-4" />} onClick={runTest}>
                    {config.testLabel}
                  </Button> : null}
                </div>
              </SettingsSection>
            ) : null}
            {!loading && sections.map((section) => (
              <SettingsSection key={section.title} title={section.title} description={section.description} icon={section.icon}>
                <FormGrid>
                  {section.fields.map((field) => (
                    <FieldControl
                      key={field.name}
                      field={field}
                      value={values[field.name]}
                      error={errors[field.name]}
                      onChange={(value) => update(field.name, value)}
                      canEdit={canEdit}
                    />
                  ))}
                </FormGrid>
              </SettingsSection>
            ))}
          </div>
        </SettingsGrid>
      </SettingsPageShell>
      <ResetConfirmation open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={() => { setValues(initial); setResetOpen(false); }} />
    </form>
  );
}

function FieldControl({ field, value, error, onChange, canEdit }: { field: Field; value: SettingValue; error?: string; onChange: (value: SettingValue) => void; canEdit: boolean }) {
  const common = { label: field.label, required: field.required, helper: field.helper, error };
  if (field.type === "textarea") {
    return <TextareaInput {...common} value={fieldValue(value)} onChange={(event) => onChange(event.target.value)} />;
  }
  if (field.type === "select") {
    return <SelectInput {...common} value={String(value ?? "")} options={field.options ?? []} onChange={(next) => onChange(field.name === "first_day_of_week" ? Number(next) : next)} />;
  }
  if (field.type === "toggle") {
    return <ToggleSwitch label={field.label} description={field.helper} checked={Boolean(value)} onChange={onChange} />;
  }
  if (field.type === "image") {
    return (
      <ImageDropzone
        label={field.label}
        value={String(fieldValue(value))}
        onChange={onChange}
        onUpload={canEdit && field.uploadPath ? async (file) => (await settingsApi.upload(field.uploadPath as string, file)).data.url : undefined}
      />
    );
  }

  return (
    <TextInput
      {...common}
      type={field.type === "date" ? "datetime-local" : field.type ?? "text"}
      value={fieldValue(value)}
      onChange={(event) => onChange(field.type === "number" ? numericValue(event.target.value) : event.target.value)}
    />
  );
}

export function SmsSettingsContent() {
  const pathname = usePathname();
  const defaults = React.useMemo<SmsProviderRow[]>(() => Object.keys(smsProviderLabels).map((provider, index) => ({
    provider,
    api_key: "",
    api_secret: "",
    sender_id: provider === "custom" ? "" : "LuxeCart",
    base_url: "",
    is_default: index === 0,
    status: index === 0,
  })), []);
  const [providers, setProviders] = React.useState(defaults);
  const [initial, setInitial] = React.useState(defaults);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState("");
  const [resetOpen, setResetOpen] = React.useState(false);
  useAuthStore((state) => state.user?.permissions);
  const canEdit = hasPermission("can_edit_sms_setting");
  const isDirty = JSON.stringify(providers) !== JSON.stringify(initial);
  useUnsavedChanges(isDirty);

  React.useEffect(() => {
    settingsApi.get<{ providers: SmsProviderRow[] }>("sms")
      .then((response) => {
        const rows = response.data.providers.length ? response.data.providers : defaults;
        setProviders(rows);
        setInitial(rows);
      })
      .catch(() => toast.error("Could not load SMS settings."))
      .finally(() => setLoading(false));
  }, [defaults]);

  function patch(index: number, key: string, value: SettingValue) {
    setProviders((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  }

  function makeDefault(index: number) {
    setProviders((rows) => rows.map((row, rowIndex) => ({ ...row, is_default: rowIndex === index })));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    try {
      setSaving(true);
      const response = await settingsApi.update<{ providers: SmsProviderRow[] }, { providers: SmsProviderRow[] }>("sms", { providers });
      setProviders(response.data.providers);
      setInitial(response.data.providers);
      toast.success(response.message || "SMS settings saved.");
    } catch (error: unknown) {
      toast.error(getApiError(error).message || "Unable to save SMS settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <SettingsPageShell title="SMS Provider" description="Manage independent SMS providers, encrypted credentials, default routing, and test delivery." icon={MessageSquareText} actions={canEdit ? <FormActions isSaving={saving} isDirty={isDirty} onReset={() => setResetOpen(true)} /> : null}>
        <SettingsGrid>
          <SettingsSubnav items={settingsNavItems} pathname={pathname} />
          <div className="space-y-4">
            {loading ? <SettingsLoading /> : providers.map((provider, index) => (
              <SettingsSection key={provider.provider} title={smsProviderLabels[String(provider.provider)] ?? String(provider.provider)} description="Provider credentials, sender identity, endpoint, and activation status." icon={MessageSquareText}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <StatusPill ok={provider.is_default} label={provider.is_default ? "Default Provider" : "Standby"} />
                  {canEdit ? <div className="flex gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => makeDefault(index)}>Set Default</Button>
                    <Button type="button" size="sm" variant="secondary" isLoading={testing === provider.provider} icon={<Send className="h-4 w-4" />} onClick={async () => {
                      setTesting(provider.provider);
                      try {
                        const response = await settingsApi.test(`sms/${provider.provider}`);
                        toast.success(response.message || "Test SMS queued.");
                      } catch {
                        toast.error("Unable to queue test SMS.");
                      } finally {
                        setTesting("");
                      }
                    }}>Test SMS</Button>
                  </div> : null}
                </div>
                <FormGrid>
                  <ToggleSwitch label="Enabled" checked={Boolean(provider.status)} onChange={(checked) => patch(index, "status", checked)} />
                  <TextInput label="Sender ID" value={provider.sender_id ?? ""} onChange={(event) => patch(index, "sender_id", event.target.value)} />
                  <TextInput label="API Key" value={provider.api_key ?? ""} onChange={(event) => patch(index, "api_key", event.target.value)} />
                  <TextInput label="API Secret" type="password" value={provider.api_secret ?? ""} onChange={(event) => patch(index, "api_secret", event.target.value)} />
                  <TextInput label="Base URL" value={provider.base_url ?? ""} onChange={(event) => patch(index, "base_url", event.target.value)} />
                </FormGrid>
              </SettingsSection>
            ))}
          </div>
        </SettingsGrid>
      </SettingsPageShell>
      <ResetConfirmation open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={() => { setProviders(initial); setResetOpen(false); }} />
    </form>
  );
}

export function PaymentSettingsContent() {
  const pathname = usePathname();
  const defaults = React.useMemo<PaymentGatewayRow[]>(() => Object.keys(paymentGatewayLabels).map((gateway, index) => ({ gateway, enabled: gateway === "cash_on_delivery", sandbox_mode: true, public_key: "", secret_key: "", api_key: "", merchant_id: "", webhook_secret: "", additional_configuration: {}, display_order: index })), []);
  const [gateways, setGateways] = React.useState(defaults);
  const [initial, setInitial] = React.useState(defaults);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  useAuthStore((state) => state.user?.permissions);
  const canEdit = hasPermission("can_edit_payment_setting");
  const isDirty = JSON.stringify(gateways) !== JSON.stringify(initial);
  useUnsavedChanges(isDirty);

  React.useEffect(() => {
    settingsApi.get<{ gateways: PaymentGatewayRow[] }>("payment")
      .then((response) => {
        const rows = response.data.gateways.length ? response.data.gateways : defaults;
        setGateways(rows);
        setInitial(rows);
      })
      .catch(() => toast.error("Could not load payment settings."))
      .finally(() => setLoading(false));
  }, [defaults]);

  function patch(index: number, key: string, value: SettingValue) {
    setGateways((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  }

  function patchGatewayConfig(index: number, key: string, value: string) {
    setGateways((rows) => rows.map((row, rowIndex) => rowIndex === index ? {
      ...row,
      additional_configuration: { ...(row.additional_configuration ?? {}), [key]: value },
    } : row));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    try {
      setSaving(true);
      const payload = gateways.map((gateway) => offlinePaymentGateways.has(gateway.gateway)
        ? {
            ...gateway,
            sandbox_mode: false,
            public_key: "",
            secret_key: "",
            api_key: "",
            merchant_id: "",
            webhook_secret: "",
          }
        : gateway);
      const response = await settingsApi.update<{ gateways: PaymentGatewayRow[] }, { gateways: PaymentGatewayRow[] }>("payment", { gateways: payload });
      setGateways(response.data.gateways);
      setInitial(response.data.gateways);
      toast.success(response.message || "Payment settings saved.");
    } catch (error: unknown) {
      toast.error(getApiError(error).message || "Unable to save payment settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <SettingsPageShell title="Payment Settings" description="Configure independent payment gateways with encrypted credentials and sandbox controls." icon={CreditCard} actions={canEdit ? <FormActions isSaving={saving} isDirty={isDirty} onReset={() => setResetOpen(true)} /> : null}>
        <SettingsGrid>
          <SettingsSubnav items={settingsNavItems} pathname={pathname} />
          <div className="grid gap-4 2xl:grid-cols-2">
            {loading ? <SettingsLoading /> : gateways.map((gateway, index) => {
              const isOfflineGateway = offlinePaymentGateways.has(gateway.gateway);

              return (
                <SettingsSection
                  key={gateway.gateway}
                  title={paymentGatewayLabels[String(gateway.gateway)] ?? String(gateway.gateway)}
                  description={isOfflineGateway ? "Gateway status only. No API credentials are required." : "Gateway status, mode, credentials, merchant identity, and webhook secret."}
                  icon={CreditCard}
                >
                  <FormGrid>
                    <ToggleSwitch label="Enable Gateway" checked={Boolean(gateway.enabled)} onChange={(checked) => patch(index, "enabled", checked)} />
                    <TextInput label="Display Name" value={gatewayConfigValue(gateway, "display_name")} onChange={(event) => patchGatewayConfig(index, "display_name", event.target.value)} />
                    <TextInput label="Display Description" value={gatewayConfigValue(gateway, "checkout_description")} onChange={(event) => patchGatewayConfig(index, "checkout_description", event.target.value)} />
                    <TextInput label="Sort Order" type="number" value={String(gateway.display_order ?? index)} onChange={(event) => patch(index, "display_order", Number(event.target.value))} />
                    <TextInput label="Gateway Logo/Icon URL" value={gatewayConfigValue(gateway, "logo_url")} onChange={(event) => patchGatewayConfig(index, "logo_url", event.target.value)} />
                    {!isOfflineGateway ? (
                      <>
                        <ToggleSwitch label="Sandbox Mode" checked={Boolean(gateway.sandbox_mode)} onChange={(checked) => patch(index, "sandbox_mode", checked)} />
                        {gateway.gateway === "sslcommerz" ? (
                          <>
                            <TextInput label="Store ID" value={gateway.merchant_id ?? ""} onChange={(event) => patch(index, "merchant_id", event.target.value)} />
                            <TextInput label="Store Password" type="password" value={gateway.secret_key ?? ""} onChange={(event) => patch(index, "secret_key", event.target.value)} />
                            <TextInput label="Success URL" value={gatewayConfigValue(gateway, "success_url")} onChange={(event) => patchGatewayConfig(index, "success_url", event.target.value)} />
                            <TextInput label="Fail URL" value={gatewayConfigValue(gateway, "fail_url")} onChange={(event) => patchGatewayConfig(index, "fail_url", event.target.value)} />
                            <TextInput label="Cancel URL" value={gatewayConfigValue(gateway, "cancel_url")} onChange={(event) => patchGatewayConfig(index, "cancel_url", event.target.value)} />
                            <TextInput label="IPN/Webhook URL" value={gatewayConfigValue(gateway, "ipn_url")} onChange={(event) => patchGatewayConfig(index, "ipn_url", event.target.value)} />
                            <TextInput label="Validation Base URL" value={gatewayConfigValue(gateway, "validation_base_url")} onChange={(event) => patchGatewayConfig(index, "validation_base_url", event.target.value)} />
                          </>
                        ) : gateway.gateway === "stripe" ? (
                          <>
                            <TextInput label="Publishable Key" value={gateway.public_key ?? ""} onChange={(event) => patch(index, "public_key", event.target.value)} />
                            <TextInput label="Secret Key" type="password" value={gateway.secret_key ?? ""} onChange={(event) => patch(index, "secret_key", event.target.value)} />
                            <TextInput label="Webhook Secret" type="password" value={gateway.webhook_secret ?? ""} onChange={(event) => patch(index, "webhook_secret", event.target.value)} />
                          </>
                        ) : gateway.gateway === "paypal" ? (
                          <>
                            <TextInput label="Client ID" value={gateway.public_key ?? ""} onChange={(event) => patch(index, "public_key", event.target.value)} />
                            <TextInput label="Client Secret" type="password" value={gateway.secret_key ?? ""} onChange={(event) => patch(index, "secret_key", event.target.value)} />
                          </>
                        ) : gateway.gateway === "bkash" ? (
                          <>
                            <TextInput label="Username" value={gateway.public_key ?? ""} onChange={(event) => patch(index, "public_key", event.target.value)} />
                            <TextInput label="Password" type="password" value={gateway.secret_key ?? ""} onChange={(event) => patch(index, "secret_key", event.target.value)} />
                            <TextInput label="App Key" type="password" value={gateway.api_key ?? ""} onChange={(event) => patch(index, "api_key", event.target.value)} />
                            <TextInput label="App Secret" type="password" value={gateway.merchant_id ?? ""} onChange={(event) => patch(index, "merchant_id", event.target.value)} />
                          </>
                        ) : gateway.gateway === "nagad" ? (
                          <>
                            <TextInput label="Merchant ID" value={gateway.merchant_id ?? ""} onChange={(event) => patch(index, "merchant_id", event.target.value)} />
                            <TextInput label="Merchant Number" value={gatewayConfigValue(gateway, "merchant_number")} onChange={(event) => patchGatewayConfig(index, "merchant_number", event.target.value)} />
                            <TextInput label="Public Key" value={gateway.public_key ?? ""} onChange={(event) => patch(index, "public_key", event.target.value)} />
                            <TextInput label="Private Key" type="password" value={gateway.secret_key ?? ""} onChange={(event) => patch(index, "secret_key", event.target.value)} />
                          </>
                        ) : gateway.gateway === "aamarpay" ? (
                          <>
                            <TextInput label="Store ID" value={gateway.merchant_id ?? ""} onChange={(event) => patch(index, "merchant_id", event.target.value)} />
                            <TextInput label="Signature Key" type="password" value={gateway.secret_key ?? ""} onChange={(event) => patch(index, "secret_key", event.target.value)} />
                            <TextInput label="Checkout URL" value={gatewayConfigValue(gateway, "checkout_url")} onChange={(event) => patchGatewayConfig(index, "checkout_url", event.target.value)} />
                            <TextInput label="Transaction Search URL" value={gatewayConfigValue(gateway, "search_url")} onChange={(event) => patchGatewayConfig(index, "search_url", event.target.value)} />
                          </>
                        ) : (
                          <>
                            <TextInput label="Public Key" value={gateway.public_key ?? ""} onChange={(event) => patch(index, "public_key", event.target.value)} />
                            <TextInput label="Secret Key" type="password" value={gateway.secret_key ?? ""} onChange={(event) => patch(index, "secret_key", event.target.value)} />
                            <TextInput label="API Key" type="password" value={gateway.api_key ?? ""} onChange={(event) => patch(index, "api_key", event.target.value)} />
                            <TextInput label="Merchant ID" value={gateway.merchant_id ?? ""} onChange={(event) => patch(index, "merchant_id", event.target.value)} />
                            <TextInput label="Webhook Secret" type="password" value={gateway.webhook_secret ?? ""} onChange={(event) => patch(index, "webhook_secret", event.target.value)} />
                          </>
                        )}
                      </>
                    ) : null}
                  </FormGrid>
                </SettingsSection>
              );
            })}
          </div>
        </SettingsGrid>
      </SettingsPageShell>
      <ResetConfirmation open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={() => { setGateways(initial); setResetOpen(false); }} />
    </form>
  );
}

export function SocialMediaSettingsContent() {
  const pathname = usePathname();
  const defaults = React.useMemo<SocialMediaRow[]>(() => ["facebook", "instagram", "linkedin", "x", "youtube", "tiktok", "pinterest"].map((platform, index) => ({ platform, url: `https://example.com/${platform}`, icon: platform, display_order: index, open_in_new_tab: true, status: index < 3 })), []);
  const [items, setItems] = React.useState(defaults);
  const [initial, setInitial] = React.useState(defaults);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  useAuthStore((state) => state.user?.permissions);
  const canEdit = hasPermission("can_edit_social_setting");
  const isDirty = JSON.stringify(items) !== JSON.stringify(initial);
  useUnsavedChanges(isDirty);

  React.useEffect(() => {
    settingsApi.get<{ items: SocialMediaRow[] }>("social")
      .then((response) => {
        const rows = response.data.items.length ? response.data.items : defaults;
        setItems(rows);
        setInitial(rows);
      })
      .catch(() => toast.error("Could not load social settings."))
      .finally(() => setLoading(false));
  }, [defaults]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    try {
      setSaving(true);
      const response = await settingsApi.update<{ items: SocialMediaRow[] }, { items: SocialMediaRow[] }>("social", { items });
      setItems(response.data.items);
      setInitial(response.data.items);
      toast.success(response.message || "Social settings saved.");
    } catch (error: unknown) {
      toast.error(getApiError(error).message || "Unable to save social settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <SettingsPageShell title="Social Media" description="Manage storefront social profiles, ordering, tab behavior, and visibility." icon={Link2} actions={canEdit ? <FormActions isSaving={saving} isDirty={isDirty} onReset={() => setResetOpen(true)} /> : null}>
        <SettingsGrid>
          <SettingsSubnav items={settingsNavItems} pathname={pathname} />
          <div className="space-y-4">
            {loading ? <SettingsLoading /> : <EditableRows title="Social Profiles" rows={items} addLabel="Add Profile" icon={Link2} fields={[["platform", "Platform"], ["url", "URL"], ["icon", "Icon"], ["display_order", "Display Order"]]} onChange={(rows) => setItems(rows as SocialMediaRow[])} canEdit={canEdit} />}
          </div>
        </SettingsGrid>
      </SettingsPageShell>
      <ResetConfirmation open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={() => { setItems(initial); setResetOpen(false); }} />
    </form>
  );
}

function EditableRows({ title, description, rows, addLabel, icon: Icon, fields, onChange, canEdit = true }: { title: string; description?: string; rows: Values[]; addLabel: string; icon: LucideIcon; fields: Array<[string, string]>; onChange: (rows: Values[]) => void; canEdit?: boolean }) {
  function patch(index: number, key: string, value: SettingValue) {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  }

  return (
    <SettingsSection title={title} description={description ?? "Create, update, reorder, enable, or disable records for this settings module."} icon={Icon}>
      <div className="space-y-3.5">
        {rows.map((row, index) => (
          <div key={String(row.id ?? `${title}-${index}`)} className="rounded-lg border border-border bg-background p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <StatusPill ok={Boolean(row.status ?? true)} label={Boolean(row.status ?? true) ? "Enabled" : "Disabled"} />
              <div className="flex gap-2">
                {canEdit && "status" in row ? <ToggleSwitch label="Status" checked={Boolean(row.status)} onChange={(checked) => patch(index, "status", checked)} /> : null}
                {canEdit && "open_in_new_tab" in row ? <ToggleSwitch label="New Tab" checked={Boolean(row.open_in_new_tab)} onChange={(checked) => patch(index, "open_in_new_tab", checked)} /> : null}
                {canEdit ? <Button type="button" variant="ghost" size="icon" aria-label="Remove row" icon={<Trash2 className="h-4 w-4" />} onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} /> : null}
              </div>
            </div>
            <FormGrid>
              {fields.map(([key, label]) => (
                <TextInput key={key} label={label} value={fieldValue(row[key])} onChange={(event) => patch(index, key, editableNumericField(key) ? numericValue(event.target.value) : event.target.value)} />
              ))}
            </FormGrid>
          </div>
        ))}
        {canEdit ? <Button type="button" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => onChange([...rows, blankRow(fields, rows.length)])}>{addLabel}</Button> : null}
      </div>
    </SettingsSection>
  );
}

function SettingsLoading() {
  return (
    <SettingsSectionSkeleton fields={6} />
  );
}

function validateFields(sections: Section[], values: Values) {
  const errors: Record<string, string> = {};
  sections.flatMap((section) => section.fields).forEach((field) => {
    const value = values[field.name];
    if (field.required && (value === null || value === undefined || String(value).trim() === "")) {
      errors[field.name] = `${field.label} is required.`;
      return;
    }
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      errors[field.name] = "Enter a valid email address.";
    }
    if (field.type === "url" && value) {
      try {
        new URL(String(value));
      } catch {
        errors[field.name] = "Enter a valid URL.";
      }
    }
  });
  return errors;
}

function flattenErrors(errors: Record<string, string[]> | undefined) {
  if (!errors) return {};
  return Object.fromEntries(Object.entries(errors).map(([key, value]) => [key, value[0] ?? "Invalid value."]));
}

function getApiError(error: unknown): { message?: string; errors?: Record<string, string[]> } {
  if (typeof error !== "object" || error === null) return {};
  const response = "response" in error ? (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response : undefined;
  return response?.data ?? {};
}

function fieldValue(value: SettingValue) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  return Array.isArray(value) ? value.join(", ") : JSON.stringify(value);
}

function numericValue(value: string) {
  if (value === "") return "";
  return Number(value);
}

function blankRow(fields: Array<[string, string]>, index: number) {
  return Object.fromEntries(fields.map(([key]) => [key, key === "display_order" ? index : editableNumericField(key) ? 0 : ""]));
}

function normalizeIncoming(module: string, values: Values) {
  if (module === "company") {
    return {
      ...values,
      currency_id: String(values.currency_id ?? (values.currency_record as { id?: number } | null)?.id ?? ""),
    };
  }
  if (module === "maintenance") {
    const allowedIps = Array.isArray(values.allowed_ip_addresses) ? values.allowed_ip_addresses : [];
    return { ...values, allowed_ip_addresses_text: allowedIps.join("\n"), estimated_return_time: values.estimated_return_time ? String(values.estimated_return_time).slice(0, 16) : "" };
  }
  return values;
}

function normalizeOutgoing(module: string, values: Values) {
  if (module === "company") {
    return {
      ...values,
      currency_id: Number(values.currency_id),
    };
  }
  if (module === "maintenance") {
    const { allowed_ip_addresses_text, ...rest } = values;
    return { ...rest, allowed_ip_addresses: String(allowed_ip_addresses_text ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean) };
  }
  return values;
}

function editableNumericField(key: string) {
  return key.includes("days")
    || key === "display_order"
    || key === "rate"
    || key === "free_shipping_minimum_amount";
}

export const settingsModules = moduleConfigs;
