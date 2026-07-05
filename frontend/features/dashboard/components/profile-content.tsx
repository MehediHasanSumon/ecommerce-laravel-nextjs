"use client";

import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { selectCompanyName, useSettingsStore } from "@/store/settings-store";
import { getInitials } from "@/utils/sanitize";

export function ProfileContent() {
  const user = useAuthStore((state) => state.user);
  const siteName = useSettingsStore(selectCompanyName);

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your {siteName} member identity, backed by the existing Laravel session.
        </p>
      </div>
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-2xl font-extrabold">
            {getInitials(user.name)}
          </div>
          <div>
            <p className="text-xl font-bold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Gold Member
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
