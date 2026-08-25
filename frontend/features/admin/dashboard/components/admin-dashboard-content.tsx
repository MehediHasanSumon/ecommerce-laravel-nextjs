"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  DollarSign,
  Layers3,
  Package,
  PackagePlus,
  RefreshCw,
  ShoppingCart,
  ShieldCheck,
  Tags,
  Truck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { routePaths } from "@/constants/routes";
import {
  dashboardService,
  type DashboardCard,
  type DashboardData,
  type DashboardPreset,
} from "@/features/admin/dashboard/services/dashboard-service";
import { FraudCheckModal } from "@/features/admin/fraud/components/fraud-check-modal";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, formatShortDate } from "@/utils/format";
import { cn } from "@/utils/cn";

const presetOptions: Array<{ label: string; value: DashboardPreset }> = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last_7_days" },
  { label: "Last 30 Days", value: "last_30_days" },
  { label: "Last 90 Days", value: "last_90_days" },
  { label: "This Month", value: "this_month" },
  { label: "This Year", value: "this_year" },
  { label: "Last 12 Months", value: "last_12_months" },
  { label: "Custom Range", value: "custom" },
];

const cardIcons: Record<string, LucideIcon> = {
  revenue: DollarSign,
  orders: ShoppingCart,
  customers: UsersRound,
  products: Package,
  collections: Layers3,
  categories: Tags,
};

const quickActions = [
  { label: "Add Product", href: `${routePaths.adminProducts}/create`, icon: PackagePlus },
  { label: "Manage Orders", href: routePaths.adminOrders, icon: ShoppingCart },
  { label: "Courier Shipments", href: routePaths.adminShipments, icon: Truck },
];

export function AdminDashboardContent() {
  const [preset, setPreset] = useState<DashboardPreset>("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fraudModalOpen, setFraudModalOpen] = useState(false);
  const canCheckFraud = hasPermission("can_view_fraud_check");

  const load = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await dashboardService.show({
          preset,
          date_from: preset === "custom" ? dateFrom || undefined : undefined,
          date_to: preset === "custom" ? dateTo || undefined : undefined,
        });
        setDashboard(response.data.dashboard);
      } catch (error) {
        toast.error(toAppError(error).message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [preset, dateFrom, dateTo],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => void load(true), 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  const showCustom = preset === "custom";

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live sales, inventory, customer, order, and merchandising analytics from your
            store database.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Select
            value={preset}
            onValueChange={(value) => setPreset(value as DashboardPreset)}
          >
            <SelectTrigger className="h-10 w-full rounded-lg px-3 text-sm sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presetOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showCustom ? (
            <>
              <DatePicker
                value={dateFrom}
                placeholder="Select date"
                onChange={setDateFrom}
              />
              <DatePicker value={dateTo} placeholder="Select date" onChange={setDateTo} />
            </>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            isLoading={refreshing}
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void load(true)}
          >
            Refresh
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading && !dashboard
          ? Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="h-40 animate-pulse bg-muted" />
            ))
          : dashboard?.cards
              .filter((card) => card.key in cardIcons)
              .map((card) => <MetricCard key={card.key} card={card} />)}
      </div>

      {dashboard ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <TablePanel title="Recent Orders" className="xl:col-span-2">
            <RecentOrders rows={dashboard.tables.recent_orders} />
          </TablePanel>
          <TablePanel title="Quick Actions">
            <QuickActions
              onFraudCheck={canCheckFraud ? () => setFraudModalOpen(true) : undefined}
            />
          </TablePanel>
        </div>
      ) : null}
      <FraudCheckModal open={fraudModalOpen} onClose={() => setFraudModalOpen(false)} />
    </div>
  );
}

function MetricCard({ card }: { card: DashboardCard }) {
  const Icon = cardIcons[card.key] ?? BarChart3;
  const positive = card.trend === "up";
  const negative = card.trend === "down";

  return (
    <Card className="rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-muted-foreground">
            {card.title}
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight">
            {valueLabel(card.value, card.format)}
          </p>
        </div>
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs font-semibold">
        {positive ? (
          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
        ) : negative ? (
          <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />
        ) : (
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span
          className={
            positive
              ? "text-emerald-600"
              : negative
                ? "text-rose-600"
                : "text-muted-foreground"
          }
        >
          {card.change_percent > 0 ? `+${card.change_percent}%` : `${card.change_percent}%`}
        </span>
        <span className="text-muted-foreground">vs previous period</span>
      </div>
      {card.details?.length ? (
        <div className="mt-4 space-y-1 border-t border-border pt-3">
          {card.details.map((detail) => (
            <div
              key={detail.label}
              className="flex items-center justify-between text-xs text-muted-foreground"
            >
              <span>{detail.label}</span>
              <span className="font-semibold text-foreground">
                {valueLabel(detail.value, detail.format)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function TablePanel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("rounded-lg p-4", className)}>
      <h2 className="mb-4 text-base font-bold">{title}</h2>
      {children}
    </Card>
  );
}

function RecentOrders({ rows }: { rows: DashboardData["tables"]["recent_orders"] }) {
  if (!rows.length) return <EmptyState />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="py-2 font-semibold">
                <Link
                  href={`${routePaths.adminOrders}/${row.id}`}
                  className="hover:text-primary"
                >
                  {row.order_number}
                </Link>
              </td>
              <td className="py-2 text-muted-foreground">{row.customer}</td>
              <td className="py-2">{row.payment_method}</td>
              <td className="py-2">{statusLabel(row.payment_status)}</td>
              <td className="py-2">{statusLabel(row.order_status)}</td>
              <td className="py-2 text-right font-bold">{formatCurrency(row.total)}</td>
              <td className="py-2 text-right text-muted-foreground">
                {dateLabel(row.date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuickActions({ onFraudCheck }: { onFraudCheck?: () => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
      {quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <Icon className="h-4 w-4 text-primary" />
            {action.label}
          </Link>
        );
      })}
      {onFraudCheck ? (
        <button
          type="button"
          onClick={onFraudCheck}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-muted"
        >
          <ShieldCheck className="h-4 w-4 text-primary" />
          Fraud Check
        </button>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      <AlertTriangle className="mr-2 h-4 w-4" />
      No data available.
    </div>
  );
}

function valueLabel(value: number, format?: "money" | "number") {
  return format === "money" ? formatCurrency(value) : value.toLocaleString();
}

function statusLabel(status: string) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold capitalize">
      {status.replace(/_/g, " ")}
    </span>
  );
}

function dateLabel(date: string | null) {
  if (!date) return "-";
  return formatShortDate(date);
}
