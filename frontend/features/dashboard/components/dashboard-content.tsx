"use client";

import { ArrowUpRight, Clock, Heart, Package, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { selectCompanyName, selectCurrencyFingerprint, useSettingsStore } from "@/store/settings-store";
import { formatPrice } from "@/utils/format";
import { getInitials } from "@/utils/sanitize";

const activity = [
  "Order LX-2026-4821 moved to shipped",
  "Nike Air Max added to wishlist",
  "Payment method verified",
  "Exclusive flash sale unlocked",
];

export function DashboardContent() {
  const user = useAuthStore((state) => state.user);
  const siteName = useSettingsStore(selectCompanyName);
  useSettingsStore(selectCurrencyFingerprint);
  const stats = [
    { label: "Total orders", value: "12", icon: ShoppingBag },
    { label: "Wishlist", value: "8", icon: Heart },
    { label: "Cart items", value: "3", icon: Package },
    { label: "Total saved", value: formatPrice(420), icon: ArrowUpRight },
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {siteName} account
              </p>
              <h2 className="mt-3 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl">
                Welcome back, {user.name.split(" ")[0]}.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Track orders, manage your profile, and keep shopping premium deals while Laravel protects your session.
              </p>
            </div>
            <Button icon={<ShoppingBag className="h-4 w-4" />}>Continue shopping</Button>
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-xl font-extrabold">
              {getInitials(user.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="mt-6 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Gold member benefits are active for this backend-secured account.
          </div>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-extrabold">{stat.value}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Recent activity</h3>
              <p className="text-sm text-muted-foreground">A quick look at your shopping account.</p>
            </div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-6 space-y-3">
            {activity.map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                  {index + 1}
                </span>
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h3 className="text-lg font-bold">Quick actions</h3>
          <div className="mt-5 grid gap-3">
            {["Update profile", "View orders", "Manage wishlist"].map((item) => (
              <button key={item} className="rounded-xl border border-border px-4 py-3 text-left text-sm font-medium transition hover:bg-muted">
                {item}
              </button>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

