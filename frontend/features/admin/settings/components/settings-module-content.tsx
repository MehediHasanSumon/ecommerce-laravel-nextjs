"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CreditCard,
  GripVertical,
  ImageIcon,
  Link2,
  MapPin,
  MessageSquareText,
  PackageCheck,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Store,
  Trash2,
  SlidersHorizontal,
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
  visibleWhen?: (values: Values) => boolean;
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

function normalizeGatewayOrder(rows: PaymentGatewayRow[]) {
  return rows.map((row, index) => ({ ...row, display_order: index }));
}

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
  visibleWhen?: (values: Values) => boolean;
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

const paymentGatewayLabels: Record<string, string> = { stripe: "Stripe", sslcommerz: "SSLCommerz", bkash: "bKash", nagad: "Nagad", paypal: "PayPal", aamarpay: "aamarPay", cash_on_delivery: "Cash On Delivery" };
const offlinePaymentGateways = new Set(["cash_on_delivery"]);
const paymentBooleanOptions = [
  { label: "Enabled", value: "true" },
  { label: "Disabled", value: "false" },
];
const paymentModeOptions = [
  { label: "Sandbox", value: "true" },
  { label: "Live", value: "false" },
];

const yesNo = [
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
];

const timezoneOptions = [
  { label: "Asia/Dhaka", value: "Asia/Dhaka" },
  { label: "UTC", value: "UTC" },
  { label: "America/New_York", value: "America/New_York" },
  { label: "Europe/London", value: "Europe/London" },
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
      currency_id: "",
      currency_position: "left",
      timezone: "Asia/Dhaka",
      date_format: "d M Y",
      time_format: "12h",
      invoice_prefix: "INV",
      invoice_footer: "",
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
      { title: "Business & Invoice", description: "Currency, timezone, and invoice presentation.", icon: PackageCheck, fields: [
        { name: "currency_id", label: "Default Currency", type: "select", required: true, options: [] },
        { name: "currency_position", label: "Currency Position", type: "select", required: true, options: yesNo },
        { name: "timezone", label: "Timezone", type: "select", required: true, options: timezoneOptions },
        { name: "date_format", label: "Date Format", required: true },
        { name: "time_format", label: "Time Format", type: "select", required: true, options: [{ label: "12 hour", value: "12h" }, { label: "24 hour", value: "24h" }] },
        { name: "invoice_prefix", label: "Invoice Prefix", required: true },
        { name: "invoice_footer", label: "Invoice Footer", type: "textarea" },
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
    description: "Configure active customer-facing features and checkout behavior.",
    icon: Store,
    defaults: {
      enable_reviews: true,
      enable_product_comments: true,
      review_access: "registered",
      comment_access: "registered",
      review_moderation_enabled: true,
      comment_moderation_enabled: true,
      guest_name_required: true,
      guest_email_required: true,
      verified_purchase_badge_enabled: true,
      one_review_per_product: true,
      review_editing_enabled: true,
      review_edit_time_limit_minutes: 1440,
      comment_editing_enabled: true,
      comment_edit_time_limit_minutes: 1440,
      floating_contact_enabled: false,
      messenger_enabled: false,
      messenger_url: "",
      whatsapp_enabled: false,
      whatsapp_number: "",
      whatsapp_message: "",
      enable_wishlist: true,
      require_login_before_checkout: false,
      allow_customer_registration: true,
      allow_guest_checkout: true,
      product_card_style: "hover_review",
      product_layout: "grid",
      product_slider_loop: true,
      product_slider_autoplay: false,
      product_slider_autoplay_delay: 5000,
      product_slider_transition_speed: 400,
      product_slider_pause_on_hover: true,
      product_slider_mouse_drag: true,
      product_slider_touch_swipe: true,
      product_slider_navigation: true,
      product_slider_pagination: false,
      product_slider_desktop_slides: 4,
      product_slider_tablet_slides: 3,
      product_slider_mobile_slides: 2,
      product_slider_space_between: 24,
      product_slider_center_mode: false,
      automatic_shipment_creation: "disabled",
      automatic_courier_provider: "",
    },
    sections: [
      { title: "Storefront Features", description: "Customer-facing catalog capabilities.", icon: PackageCheck, fields: [
        { name: "enable_wishlist", label: "Enable Wishlist", type: "toggle" },
      ] },
      { title: "Review & Comment Settings", description: "Control feedback access, moderation, guest identity, badges, and editing windows.", icon: MessageSquareText, fields: [
        { name: "enable_reviews", label: "Enable Product Reviews", type: "toggle" },
        { name: "enable_product_comments", label: "Enable Product Comments", type: "toggle" },
        { name: "review_access", label: "Review Permission", type: "select", required: true, options: [
          { label: "Registered Users Only", value: "registered" },
          { label: "Everyone (Guests + Registered Users)", value: "everyone" },
        ] },
        { name: "comment_access", label: "Comment Permission", type: "select", required: true, options: [
          { label: "Registered Users Only", value: "registered" },
          { label: "Everyone (Guests + Registered Users)", value: "everyone" },
        ] },
        { name: "review_moderation_enabled", label: "Enable Review Moderation", type: "toggle" },
        { name: "comment_moderation_enabled", label: "Enable Comment Moderation", type: "toggle" },
        { name: "guest_name_required", label: "Guest Name Required", type: "toggle" },
        { name: "guest_email_required", label: "Guest Email Required", type: "toggle" },
        { name: "verified_purchase_badge_enabled", label: "Enable Verified Purchase Badge", type: "toggle" },
        { name: "one_review_per_product", label: "Allow One Review Per Product Per Customer", type: "toggle" },
        { name: "review_editing_enabled", label: "Allow Review Editing", type: "toggle" },
        { name: "review_edit_time_limit_minutes", label: "Review Edit Time Limit (Minutes)", type: "number", visibleWhen: (values) => Boolean(values.review_editing_enabled) },
        { name: "comment_editing_enabled", label: "Allow Comment Editing", type: "toggle" },
        { name: "comment_edit_time_limit_minutes", label: "Comment Edit Time Limit (Minutes)", type: "number", visibleWhen: (values) => Boolean(values.comment_editing_enabled) },
      ] },
      { title: "Floating Contact Buttons", description: "Configure the storefront Messenger and WhatsApp quick-contact actions.", icon: Send, fields: [
        { name: "floating_contact_enabled", label: "Enable Floating Contact Buttons", type: "toggle" },
        { name: "messenger_enabled", label: "Enable Facebook Messenger", type: "toggle", visibleWhen: (values) => Boolean(values.floating_contact_enabled) },
        { name: "messenger_url", label: "Messenger URL", type: "url", required: true, visibleWhen: (values) => Boolean(values.floating_contact_enabled && values.messenger_enabled) },
        { name: "whatsapp_enabled", label: "Enable WhatsApp", type: "toggle", visibleWhen: (values) => Boolean(values.floating_contact_enabled) },
        { name: "whatsapp_number", label: "WhatsApp Number", required: true, visibleWhen: (values) => Boolean(values.floating_contact_enabled && values.whatsapp_enabled) },
        { name: "whatsapp_message", label: "Pre-filled Message", type: "textarea", visibleWhen: (values) => Boolean(values.floating_contact_enabled && values.whatsapp_enabled) },
      ] },
      { title: "Authentication & Customer Settings", description: "Control customer registration and guest checkout access.", icon: ShieldAlert, fields: [
        { name: "allow_customer_registration", label: "Allow Customer Registration", type: "toggle" },
        { name: "allow_guest_checkout", label: "Allow Guest Checkout", type: "toggle" },
      ] },
      { title: "Courier Automation", description: "Choose when confirmed orders should be queued for shipment creation.", icon: PackageCheck, fields: [
        { name: "automatic_shipment_creation", label: "Automatically Create Shipment", type: "select", required: true, options: [
          { label: "Disabled", value: "disabled" },
          { label: "After Order Confirmation", value: "after_order_confirmation" },
          { label: "After Payment", value: "after_payment" },
          { label: "After Packaging", value: "after_packaging" },
          { label: "After Processing", value: "after_processing" },
        ] },
        { name: "automatic_courier_provider", label: "Automatic Courier Provider", type: "select", required: true, visibleWhen: (values) => values.automatic_shipment_creation !== "disabled", options: [
          { label: "Steadfast Courier", value: "steadfast" },
          { label: "Pathao Courier", value: "pathao" },
        ] },
      ] },
      { title: "Product Card Settings", description: "Control the global product card style and storefront product layout.", icon: SlidersHorizontal, fields: [
        { name: "product_card_style", label: "Product Card Style", type: "select", required: true, options: [
          { label: "Simple Mode", value: "simple" },
          { label: "Hover Mode", value: "hover" },
          { label: "Hover + Review Mode", value: "hover_review" },
        ] },
        { name: "product_layout", label: "Product Layout", type: "select", required: true, options: [
          { label: "Grid Mode", value: "grid" },
          { label: "Swipe Mode", value: "swipe" },
          { label: "List Mode", value: "list" },
        ] },
      ] },
      { title: "Swipe Layout", description: "Configure the responsive carousel used when Product Layout is set to Swipe Mode.", icon: SlidersHorizontal, visibleWhen: (values) => values.product_layout === "swipe", fields: [
        { name: "product_slider_loop", label: "Infinite Loop", type: "toggle", visibleWhen: (values) => values.product_layout === "swipe" },
        { name: "product_slider_autoplay", label: "Autoplay", type: "toggle", visibleWhen: (values) => values.product_layout === "swipe" },
        { name: "product_slider_autoplay_delay", label: "Autoplay Delay (ms)", type: "number", visibleWhen: (values) => values.product_layout === "swipe" },
        { name: "product_slider_transition_speed", label: "Transition Speed (ms)", type: "number", visibleWhen: (values) => values.product_layout === "swipe" },
        { name: "product_slider_pause_on_hover", label: "Pause on Hover", type: "toggle", visibleWhen: (values) => values.product_layout === "swipe" },
        { name: "product_slider_mouse_drag", label: "Mouse Drag", type: "toggle", visibleWhen: (values) => values.product_layout === "swipe" },
        { name: "product_slider_touch_swipe", label: "Touch Swipe", type: "toggle", visibleWhen: (values) => values.product_layout === "swipe" },
        { name: "product_slider_navigation", label: "Navigation Arrows", type: "toggle", visibleWhen: (values) => values.product_layout === "swipe" },
        { name: "product_slider_pagination", label: "Pagination Dots", type: "toggle", visibleWhen: (values) => values.product_layout === "swipe" },
        { name: "product_slider_desktop_slides", label: "Slides per View (Desktop)", type: "number", visibleWhen: (values) => values.product_layout === "swipe" },
        { name: "product_slider_tablet_slides", label: "Slides per View (Tablet)", type: "number", visibleWhen: (values) => values.product_layout === "swipe" },
        { name: "product_slider_mobile_slides", label: "Slides per View (Mobile)", type: "number", visibleWhen: (values) => values.product_layout === "swipe" },
        { name: "product_slider_space_between", label: "Space Between Slides", type: "number", visibleWhen: (values) => values.product_layout === "swipe" },
        { name: "product_slider_center_mode", label: "Center Mode", type: "toggle", visibleWhen: (values) => values.product_layout === "swipe" },
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
      enable_sitemap: true,
      sitemap_url: "",
      og_title: "",
      og_description: "",
      og_image: "",
      twitter_card_type: "summary_large_image",
      twitter_title: "",
      twitter_description: "",
      twitter_image: "",
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
        { name: "enable_sitemap", label: "Enable Sitemap", type: "toggle" },
        { name: "sitemap_url", label: "Sitemap URL", type: "url" },
      ] },
      { title: "Social Preview", description: "Open Graph and Twitter Card metadata.", icon: Link2, fields: [
        { name: "og_title", label: "OG Title" },
        { name: "og_description", label: "OG Description", type: "textarea" },
        { name: "og_image", label: "OG Image", type: "image", uploadPath: "seo" },
        { name: "twitter_card_type", label: "Twitter Card Type", type: "select", options: [{ label: "Summary", value: "summary" }, { label: "Large Image", value: "summary_large_image" }, { label: "App", value: "app" }, { label: "Player", value: "player" }] },
        { name: "twitter_title", label: "Twitter Title" },
        { name: "twitter_description", label: "Twitter Description", type: "textarea" },
        { name: "twitter_image", label: "Twitter Image", type: "image", uploadPath: "seo" },
      ] },
    ],
  },
};

const settingEditPermissions: Record<string, string> = {
  company: "can_edit_company_setting",
  store: "can_edit_store_setting",
  seo: "can_edit_seo_setting",
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
              section.visibleWhen && !section.visibleWhen(values) ? null : (
              <SettingsSection key={section.title} title={section.title} description={section.description} icon={section.icon}>
                <FormGrid>
                  {section.fields.map((field) => (
                    field.visibleWhen && !field.visibleWhen(values) ? null : (
                      <FieldControl
                        key={field.name}
                        field={field}
                        value={values[field.name]}
                        error={errors[field.name]}
                        onChange={(value) => update(field.name, value)}
                        canEdit={canEdit}
                      />
                    )
                  ))}
                </FormGrid>
              </SettingsSection>
              )
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

export function PaymentSettingsContent() {
  const pathname = usePathname();
  const defaults = React.useMemo<PaymentGatewayRow[]>(() => Object.keys(paymentGatewayLabels).map((gateway, index) => ({ gateway, enabled: gateway === "cash_on_delivery", sandbox_mode: true, public_key: "", secret_key: "", api_key: "", merchant_id: "", webhook_secret: "", additional_configuration: {}, display_order: index })), []);
  const [gateways, setGateways] = React.useState(defaults);
  const [initial, setInitial] = React.useState(defaults);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [draggedGateway, setDraggedGateway] = React.useState<string | null>(null);
  const [dropGateway, setDropGateway] = React.useState<string | null>(null);
  useAuthStore((state) => state.user?.permissions);
  const canEdit = hasPermission("can_edit_payment_setting");
  const isDirty = JSON.stringify(gateways) !== JSON.stringify(initial);
  useUnsavedChanges(isDirty);

  React.useEffect(() => {
    settingsApi.get<{ gateways: PaymentGatewayRow[] }>("payment")
      .then((response) => {
        const rows = normalizeGatewayOrder(response.data.gateways.length ? response.data.gateways : defaults);
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

  function moveGateway(targetGateway: string) {
    if (!canEdit || !draggedGateway || draggedGateway === targetGateway) return;

    setGateways((rows) => {
      const from = rows.findIndex((row) => row.gateway === draggedGateway);
      const to = rows.findIndex((row) => row.gateway === targetGateway);
      if (from < 0 || to < 0) return rows;

      const next = [...rows];
      const [dragged] = next.splice(from, 1);
      next.splice(to, 0, dragged);
      return normalizeGatewayOrder(next);
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    try {
      setSaving(true);
      const payload = normalizeGatewayOrder(gateways).map((gateway) => offlinePaymentGateways.has(gateway.gateway)
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
      const rows = normalizeGatewayOrder(response.data.gateways);
      setGateways(rows);
      setInitial(rows);
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
              const isDragging = draggedGateway === gateway.gateway;
              const isDropTarget = dropGateway === gateway.gateway && draggedGateway !== gateway.gateway;

              return (
                <div
                  key={gateway.gateway}
                  onDragOver={(event) => {
                    if (!canEdit || !draggedGateway) return;
                    event.preventDefault();
                    setDropGateway(gateway.gateway);
                  }}
                  onDragLeave={() => setDropGateway((current) => current === gateway.gateway ? null : current)}
                  onDrop={(event) => {
                    event.preventDefault();
                    moveGateway(gateway.gateway);
                    setDraggedGateway(null);
                    setDropGateway(null);
                  }}
                  className={`relative transition ${isDragging ? "opacity-60" : ""} ${isDropTarget ? "rounded-lg outline outline-2 outline-ring" : ""}`}
                >
                  {canEdit ? (
                    <button
                      type="button"
                      draggable
                      aria-label={`Move ${paymentGatewayLabels[String(gateway.gateway)] ?? String(gateway.gateway)}`}
                      title="Drag to reorder"
                      onDragStart={(event) => {
                        setDraggedGateway(gateway.gateway);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", gateway.gateway);
                      }}
                      onDragEnd={() => {
                        setDraggedGateway(null);
                        setDropGateway(null);
                      }}
                      className="absolute right-3 top-3 z-10 flex h-8 w-8 cursor-grab items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  ) : null}
                  <SettingsSection
                    title={paymentGatewayLabels[String(gateway.gateway)] ?? String(gateway.gateway)}
                    description={isOfflineGateway ? "Gateway status only. No API credentials are required." : "Gateway status, mode, credentials, merchant identity, and webhook secret."}
                    icon={CreditCard}
                    className="flex h-[34rem] flex-col overflow-hidden"
                    bodyClassName="min-h-0 flex-1 overflow-y-auto"
                  >
                    <FormGrid>
                      <SelectInput label="Enable Gateway" value={String(Boolean(gateway.enabled))} options={paymentBooleanOptions} onChange={(value) => patch(index, "enabled", value === "true")} />
                      <TextInput label="Display Name" value={gatewayConfigValue(gateway, "display_name")} onChange={(event) => patchGatewayConfig(index, "display_name", event.target.value)} />
                      <TextInput label="Display Description" value={gatewayConfigValue(gateway, "checkout_description")} onChange={(event) => patchGatewayConfig(index, "checkout_description", event.target.value)} />
                      <TextInput label="Gateway Logo/Icon URL" value={gatewayConfigValue(gateway, "logo_url")} onChange={(event) => patchGatewayConfig(index, "logo_url", event.target.value)} />
                      {!isOfflineGateway ? (
                        <>
                          <SelectInput label="Sandbox Mode" value={String(Boolean(gateway.sandbox_mode))} options={paymentModeOptions} onChange={(value) => patch(index, "sandbox_mode", value === "true")} />
                          {gateway.gateway === "sslcommerz" ? (
                            <>
                              <TextInput label="Store ID" value={gateway.merchant_id ?? ""} onChange={(event) => patch(index, "merchant_id", event.target.value)} />
                              <TextInput label="Store Password" type="password" value={gateway.secret_key ?? ""} onChange={(event) => patch(index, "secret_key", event.target.value)} />
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
                </div>
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
  const defaults = React.useMemo<SocialMediaRow[]>(() => ["facebook", "instagram", "linkedin", "x", "youtube", "tiktok", "pinterest"].map((platform, index) => ({ platform, url: "", icon: platform, display_order: index, open_in_new_tab: true, status: false })), []);
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
            {loading ? <SettingsLoading /> : <EditableRows title="Social Profiles" rows={items} addLabel="Add Profile" icon={Link2} fields={[["platform", "Platform"], ["url", "URL"], ["icon", "Icon"]]} onChange={(rows) => setItems(rows as SocialMediaRow[])} canEdit={canEdit} />}
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
  sections.forEach((section) => {
    if (section.visibleWhen && !section.visibleWhen(values)) return;
    section.fields.forEach((field) => {
      if (field.visibleWhen && !field.visibleWhen(values)) return;
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
    if (field.name === "messenger_url" && value) {
      try {
        const url = new URL(String(value));
        const host = url.hostname.toLowerCase();
        const allowed = url.protocol === "https:" && (
          host === "m.me"
          || host === "messenger.com"
          || host.endsWith(".messenger.com")
          || host === "facebook.com"
          || host.endsWith(".facebook.com")
        );
        if (!allowed) errors[field.name] = "Enter an official HTTPS Messenger or Facebook URL.";
      } catch {
        errors[field.name] = "Enter a valid Messenger URL.";
      }
    }
    if (field.name === "whatsapp_number" && value && !/^\+?[1-9][0-9]{6,14}$/.test(String(value).replace(/[\s().-]+/g, ""))) {
      errors[field.name] = "Enter a valid international WhatsApp number.";
    }
    if (field.name === "whatsapp_message" && String(value ?? "").length > 500) {
      errors[field.name] = "The pre-filled message may not exceed 500 characters.";
    }
    });
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
