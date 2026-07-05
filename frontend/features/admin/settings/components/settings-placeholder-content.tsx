"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Save } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsGrid, SettingsPageShell, SettingsSection, SettingsSubnav, FormGrid, TextInput, TextareaInput, SelectInput, ToggleSwitch, StatusPill, saveWithToast, useUnsavedChanges } from "@/features/admin/settings/components/settings-primitives";
import { settingsNavItems } from "@/features/admin/settings/components/settings-navigation";

export function SettingsPlaceholderContent({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  const pathname = usePathname();
  const [saving, setSaving] = React.useState(false);
  const [enabled, setEnabled] = React.useState(true);
  const [label, setLabel] = React.useState(title);
  const [notes, setNotes] = React.useState("");
  const [mode, setMode] = React.useState("standard");
  const isDirty = label !== title || notes !== "" || mode !== "standard" || !enabled;
  useUnsavedChanges(isDirty);

  return (
    <form onSubmit={(event) => { event.preventDefault(); saveWithToast(setSaving); }}>
      <SettingsPageShell
        title={title}
        description={description}
        icon={icon}
        actions={<Button type="submit" size="sm" isLoading={saving} icon={<Save className="h-4 w-4" />}>Save Settings</Button>}
      >
        <SettingsGrid>
          <SettingsSubnav items={settingsNavItems} pathname={pathname} />
          <div className="space-y-5">
            <SettingsSection title={`${title} Overview`} description="This page is ready for backend integration and follows the same form architecture as the completed settings pages." icon={icon}>
              <div className="mb-4">
                <StatusPill ok={enabled} label={enabled ? "Enabled" : "Disabled"} />
              </div>
              <FormGrid>
                <TextInput label="Setting Label" value={label} onChange={(event) => setLabel(event.target.value)} />
                <SelectInput label="Mode" value={mode} options={[{ label: "Standard", value: "standard" }, { label: "Strict", value: "strict" }, { label: "Custom", value: "custom" }]} onChange={setMode} />
              </FormGrid>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextareaInput label="Internal Notes" value={notes} onChange={(event) => setNotes(event.target.value)} helper="Use this area for operational notes until the final API schema is connected." />
                <ToggleSwitch label={`Enable ${title}`} checked={enabled} onChange={setEnabled} description="Controls whether this settings area is active in the admin UI." />
              </div>
            </SettingsSection>
          </div>
        </SettingsGrid>
      </SettingsPageShell>
    </form>
  );
}
