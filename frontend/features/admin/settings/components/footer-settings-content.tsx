"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Globe,
  PanelBottom,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FormActions,
  ImageDropzone,
  LoadingInline,
  ResetConfirmation,
  SettingsGrid,
  SettingsPageShell,
  SettingsSection,
  SettingsSubnav,
  StatusPill,
  TextInput,
  ToggleSwitch,
  useUnsavedChanges,
} from "@/features/admin/settings/components/settings-primitives";
import { settingsNavItems } from "@/features/admin/settings/components/settings-navigation";
import { settingsApi } from "@/features/admin/settings/services/settings-service";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";

export type SocialLinkRow = {
  platform: string;
  url: string;
  icon: string;
  open_in_new_tab: boolean;
  status: boolean;
  display_order?: number;
};

export type FooterSettingsFormValues = {
  payment_banner_image: string | null;
  payment_banner_enabled: boolean;
  payment_banner_title: string;
  social_links: SocialLinkRow[];
};

export const AVAILABLE_PLATFORMS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X (Twitter)" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "pinterest", label: "Pinterest" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "threads", label: "Threads" },
] as const;

const defaultFormValues: FooterSettingsFormValues = {
  payment_banner_image: null,
  payment_banner_enabled: true,
  payment_banner_title: "We accept",
  social_links: [
    { platform: "facebook", url: "https://facebook.com", icon: "facebook", open_in_new_tab: true, status: true, display_order: 0 },
    { platform: "instagram", url: "https://instagram.com", icon: "instagram", open_in_new_tab: true, status: true, display_order: 1 },
    { platform: "youtube", url: "https://youtube.com", icon: "youtube", open_in_new_tab: true, status: true, display_order: 2 },
    { platform: "x", url: "https://x.com", icon: "x", open_in_new_tab: true, status: false, display_order: 3 },
    { platform: "tiktok", url: "https://tiktok.com", icon: "tiktok", open_in_new_tab: true, status: false, display_order: 4 },
    { platform: "linkedin", url: "https://linkedin.com", icon: "linkedin", open_in_new_tab: true, status: false, display_order: 5 },
    { platform: "pinterest", url: "https://pinterest.com", icon: "pinterest", open_in_new_tab: true, status: false, display_order: 6 },
    { platform: "whatsapp", url: "", icon: "whatsapp", open_in_new_tab: true, status: false, display_order: 7 },
  ],
};

export function FooterSettingsContent() {
  const pathname = usePathname();
  const [values, setValues] = React.useState<FooterSettingsFormValues>(defaultFormValues);
  const [initial, setInitial] = React.useState<FooterSettingsFormValues>(defaultFormValues);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);

  useAuthStore((state) => state.user?.permissions);
  const canEdit = hasPermission("can_edit_footer_setting") || hasPermission("can_edit_store_setting");
  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChanges(isDirty);

  React.useEffect(() => {
    settingsApi
      .get<FooterSettingsFormValues>("footer")
      .then((response) => {
        const data = response.data;
        const form: FooterSettingsFormValues = {
          payment_banner_image: data.payment_banner_image || null,
          payment_banner_enabled: data.payment_banner_enabled !== false,
          payment_banner_title: data.payment_banner_title || "We accept",
          social_links: Array.isArray(data.social_links) && data.social_links.length > 0
            ? data.social_links
            : defaultFormValues.social_links,
        };
        setValues(form);
        setInitial(form);
      })
      .catch(() => {
        toast.error("Could not load footer settings.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleBannerUpload(file: File): Promise<string> {
    const res = await settingsApi.upload("footer", file);
    return res.data?.url || "";
  }

  function handleAddSocialLink() {
    setValues((prev) => {
      const existing = prev.social_links.map((s) => s.platform);
      const nextPlatform = AVAILABLE_PLATFORMS.find((p) => !existing.includes(p.value))?.value || "facebook";
      return {
        ...prev,
        social_links: [
          ...prev.social_links,
          {
            platform: nextPlatform,
            url: "",
            icon: nextPlatform,
            open_in_new_tab: true,
            status: true,
            display_order: prev.social_links.length,
          },
        ],
      };
    });
  }

  function handleUpdateSocialLink(index: number, patch: Partial<SocialLinkRow>) {
    setValues((prev) => ({
      ...prev,
      social_links: prev.social_links.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, ...patch };
        if (patch.platform) {
          updated.icon = patch.platform;
        }
        return updated;
      }),
    }));
  }

  function handleRemoveSocialLink(index: number) {
    setValues((prev) => ({
      ...prev,
      social_links: prev.social_links.filter((_, i) => i !== index),
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;

    try {
      setSaving(true);
      const response = await settingsApi.update<FooterSettingsFormValues, FooterSettingsFormValues>("footer", values);
      const data = response.data;
      const updated: FooterSettingsFormValues = {
        payment_banner_image: data.payment_banner_image || null,
        payment_banner_enabled: data.payment_banner_enabled !== false,
        payment_banner_title: data.payment_banner_title || "We accept",
        social_links: Array.isArray(data.social_links) ? data.social_links : [],
      };
      setValues(updated);
      setInitial(updated);
      toast.success(response.message || "Footer settings saved.");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Unable to save footer settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <SettingsPageShell
        title="Footer Settings"
        description="Manage social media profiles, selected brand icons, and accepted payment banner image for the storefront footer."
        icon={PanelBottom}
        actions={canEdit ? <FormActions isSaving={saving} isDirty={isDirty} onReset={() => setResetOpen(true)} /> : null}
      >
        <SettingsGrid>
          <SettingsSubnav items={settingsNavItems} pathname={pathname} />

          <div className="space-y-6">
            {loading ? (
              <LoadingInline label="Loading footer settings..." />
            ) : (
              <>
                {/* Payment Banner Section */}
                <SettingsSection
                  title="Payment Banner"
                  description="Upload a banner image displaying supported payment gateways (e.g. Cards, bKash, Nagad, Visa, Mastercard) shown in the footer."
                  icon={UploadCloud}
                >
                  <div className="space-y-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Enable Payment Banner</h3>
                        <p className="text-xs text-muted-foreground">Toggle to display or hide the payment methods banner in the storefront footer.</p>
                      </div>
                      <ToggleSwitch
                        label=""
                        checked={values.payment_banner_enabled}
                        onChange={(checked) => setValues((prev) => ({ ...prev, payment_banner_enabled: checked }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <TextInput
                        label="Banner Section Title"
                        value={values.payment_banner_title}
                        helper="Heading displayed right above the payment methods banner."
                        placeholder="e.g. We accept"
                        onChange={(e) => setValues((prev) => ({ ...prev, payment_banner_title: e.target.value }))}
                      />
                    </div>

                    <div className="mt-2 space-y-2">
                      <ImageDropzone
                        label="Payment Banner Graphic"
                        value={values.payment_banner_image || ""}
                        onChange={(val) => setValues((prev) => ({ ...prev, payment_banner_image: val || null }))}
                        onUpload={canEdit ? handleBannerUpload : undefined}
                      />
                    </div>
                  </div>
                </SettingsSection>

                {/* Social Media Profiles Section */}
                <SettingsSection
                  title="Social Media Profiles"
                  description="Add your official social media channels, choose their icons, and manage their storefront visibility."
                  icon={Globe}
                >
                  <div className="space-y-4">
                    {values.social_links.map((link, index) => (
                      <div
                        key={`${link.platform}-${index}`}
                        className="rounded-xl border border-border bg-background p-4 shadow-sm transition-all"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                          <div className="flex items-center gap-2">
                            <StatusPill ok={link.status} label={link.status ? "Enabled" : "Disabled"} />
                            <span className="text-xs font-bold capitalize text-foreground">{link.platform}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {canEdit ? (
                              <ToggleSwitch
                                label="Active"
                                checked={link.status}
                                onChange={(checked) => handleUpdateSocialLink(index, { status: checked })}
                              />
                            ) : null}
                            {canEdit ? (
                              <ToggleSwitch
                                label="New Tab"
                                checked={link.open_in_new_tab}
                                onChange={(checked) => handleUpdateSocialLink(index, { open_in_new_tab: checked })}
                              />
                            ) : null}
                            {canEdit ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Remove social profile"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveSocialLink(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-foreground">
                              Platform / Icon
                            </label>
                            <Select
                              value={link.platform}
                              onValueChange={(val) => handleUpdateSocialLink(index, { platform: val })}
                              disabled={!canEdit}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select platform" />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_PLATFORMS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="sm:col-span-2">
                            <TextInput
                              label="Profile / Channel URL"
                              value={link.url}
                              placeholder={`https://${link.platform}.com/yourpage`}
                              onChange={(e) => handleUpdateSocialLink(index, { url: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {canEdit ? (
                      <Button
                        type="button"
                        variant="secondary"
                        icon={<Plus className="h-4 w-4" />}
                        onClick={handleAddSocialLink}
                      >
                        Add Social Profile
                      </Button>
                    ) : null}
                  </div>
                </SettingsSection>
              </>
            )}
          </div>
        </SettingsGrid>
      </SettingsPageShell>

      <ResetConfirmation
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          setValues(initial);
          setResetOpen(false);
        }}
      />
    </form>
  );
}
