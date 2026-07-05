"use client";

"use client";

import { Card } from "@/components/ui/card";
import { selectCompanyName, useSettingsStore } from "@/store/settings-store";

const settings = [
  ["Order alerts", "Enabled"],
  ["Member deals", "Enabled"],
  ["Secure session", "Laravel"],
  ["Token storage in browser", "Disabled"],
];

export function SettingsContent() {
  const siteName = useSettingsStore(selectCompanyName);

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Settings</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {siteName} account preferences with the existing secure auth flow preserved.
        </p>
      </div>
      <Card className="divide-y divide-border">
        {settings.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium">{label}</p>
            <span className="rounded-xl bg-muted px-3 py-1 text-sm font-semibold text-foreground">
              {value}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
