"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CreditCard,
  DollarSign,
  Layers3,
  Package,
  PackagePlus,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  ShieldAlert,
  ShieldCheck,
  Star,
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
  type DashboardPoint,
  type DashboardPreset,
} from "@/features/admin/dashboard/services/dashboard-service";
import { FraudCheckModal } from "@/features/admin/fraud/components/fraud-check-modal";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
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
  collections: ShoppingBag,
  brands: Tags,
  categories: Layers3,
  blogs: BookOpen,
  wishlist: Star,
  reviews: Star,
  ip_blocks: ShieldAlert,
  automatic_ip_blocks: AlertTriangle,
};

const quickActions = [
  { label: "Create Product", href: routePaths.adminProductCreate, icon: PackagePlus },
  {
    label: "Create Collection",
    href: routePaths.adminCollections + "/create",
    icon: ShoppingBag,
  },
  { label: "Create Coupon", href: routePaths.adminDiscounts, icon: Tags },
  { label: "Add Blog", href: routePaths.adminBlogs, icon: BookOpen },
  { label: "View Orders", href: routePaths.adminOrders, icon: ShoppingCart },
  { label: "Manage Customers", href: routePaths.dashboardUsers, icon: UsersRound },
  {
    label: "Shipping Management",
    href: routePaths.adminSettingsShippingMethods,
    icon: Truck,
  },
  { label: "Payment Settings", href: routePaths.adminSettingsPayment, icon: CreditCard },
];

function valueLabel(value: number, format: "money" | "number") {
  return format === "money"
    ? formatCurrency(value)
    : new Intl.NumberFormat("en").format(value);
}

function dateLabel(value: string | null) {
  return value ? formatShortDate(value) : "Not set";
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AdminDashboardContent() {
  const [preset, setPreset] = useState<DashboardPreset>("last_30_days");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fraudModalOpen, setFraudModalOpen] = useState(false);
  useAuthStore((state) => state.user?.permissions);
  const canCheckFraud = hasPermission("can_create_fraud_check");

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      setRefreshing(quiet);
      try {
        const response = await dashboardService.show({
          preset,
          date_from: preset === "custom" ? dateFrom : undefined,
          date_to: preset === "custom" ? dateTo : undefined,
        });
        setDashboard(response.data.dashboard);
      } catch (error) {
        toast.error(toAppError(error).message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dateFrom, dateTo, preset],
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {loading && !dashboard
          ? Array.from({ length: 10 }).map((_, index) => (
              <Card key={index} className="h-40 animate-pulse bg-muted" />
            ))
          : dashboard?.cards.map((card) => <MetricCard key={card.key} card={card} />)}
      </div>

      {dashboard ? (
        <>
          {dashboard.security ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <TablePanel title="Top Blocked Countries">
                <SecurityRankedRows
                  rows={dashboard.security.top_countries.map((row) => ({
                    label: row.country,
                    value: row.total,
                  }))}
                />
              </TablePanel>
              <TablePanel title="Top Block Reasons">
                <SecurityRankedRows
                  rows={dashboard.security.top_reasons.map((row) => ({
                    label: row.reason,
                    value: row.total,
                  }))}
                />
              </TablePanel>
            </div>
          ) : null}

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

          <div className="grid gap-4 xl:grid-cols-3">
            <TablePanel title="Low Stock Products">
              <StockRows rows={dashboard.tables.low_stock_products} />
            </TablePanel>
            <TablePanel title="Out of Stock Products">
              <StockRows rows={dashboard.tables.out_of_stock_products} />
            </TablePanel>
            <TablePanel title="Reports Summary">
              <ReportRows rows={dashboard.reports} />
            </TablePanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <TablePanel title="Top Categories">
              <TopCategories rows={dashboard.tables.top_categories} />
            </TablePanel>
            {dashboard.brand_enabled ? (
              <TablePanel title="Top Brands">
                <TopBrands rows={dashboard.tables.top_brands} />
              </TablePanel>
            ) : null}
            <TablePanel title="Revenue by Collection">
              <RankedChart rows={dashboard.charts.collections} />
            </TablePanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <TablePanel title="Latest Customers">
              <Customers rows={dashboard.tables.latest_customers} />
            </TablePanel>
            <TablePanel title="Recent Reviews">
              <Reviews rows={dashboard.tables.recent_reviews} />
            </TablePanel>
            <TablePanel title="Latest Activities">
              <Activity rows={dashboard.tables.activity} />
            </TablePanel>
          </div>
        </>
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
          {Math.abs(card.change_percent).toFixed(1)}%
        </span>
        <span className="text-muted-foreground">vs previous period</span>
      </div>
      {card.details.length ? (
        <div className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
          {card.details.slice(0, 4).map((detail) => (
            <div key={detail.label} className="flex items-center justify-between gap-2">
              <span className="truncate">{detail.label}</span>
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

function StockRows({ rows }: { rows: DashboardData["tables"]["low_stock_products"] }) {
  if (!rows.length) return <EmptyState />;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.sku || "No SKU"} · min {row.minimum_stock}
            </p>
          </div>
          <span className="rounded-lg bg-muted px-2 py-1 text-xs font-bold">
            {row.current_stock}
          </span>
        </div>
      ))}
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

function ReportRows({ rows }: { rows: DashboardData["reports"] }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="font-bold">{valueLabel(row.value, row.format)}</span>
        </div>
      ))}
    </div>
  );
}

function TopCategories({ rows }: { rows: DashboardData["tables"]["top_categories"] }) {
  if (!rows.length) return <EmptyState />;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.name} className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.sold_quantity} sold</p>
          </div>
          <span className="font-bold">{formatCurrency(row.revenue)}</span>
        </div>
      ))}
    </div>
  );
}

function TopBrands({ rows }: { rows: DashboardData["tables"]["top_brands"] }) {
  if (!rows.length) return <EmptyState />;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.name} className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.sales} sales</p>
          </div>
          <span className="font-bold">{formatCurrency(row.revenue)}</span>
        </div>
      ))}
    </div>
  );
}

function RankedChart({ rows }: { rows: DashboardPoint[] }) {
  if (!rows.length) return <EmptyState />;
  const max = Math.max(...rows.map((row) => row.value), 0);
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate font-semibold">{row.label}</span>
            <span>{formatCurrency(row.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${max ? (row.value / max) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SecurityRankedRows({ rows }: { rows: Array<{ label: string; value: number }> }) {
  if (!rows.length)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No security data yet.
      </p>
    );
  const maximum = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{row.label}</span>
            <span className="font-bold">{row.value}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.max(4, (row.value / maximum) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Customers({ rows }: { rows: DashboardData["tables"]["latest_customers"] }) {
  if (!rows.length) return <EmptyState />;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-3">
          <Image
            src={row.avatar}
            alt={row.name}
            width={34}
            height={34}
            unoptimized
            className="rounded-full"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{row.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.email} · {dateLabel(row.registered_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Reviews({ rows }: { rows: DashboardData["tables"]["recent_reviews"] }) {
  if (!rows.length) return <EmptyState />;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id}>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{row.product}</p>
            <span className="flex items-center gap-1 text-xs font-bold">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {row.rating}
            </span>
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">{row.review}</p>
        </div>
      ))}
    </div>
  );
}

function Activity({ rows }: { rows: DashboardData["tables"]["activity"] }) {
  if (!rows.length) return <EmptyState />;
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={`${row.type}-${index}`} className="flex gap-3">
          <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
          <div>
            <p className="text-sm font-semibold">{row.title}</p>
            <p className="text-xs text-muted-foreground">{row.description}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {dateLabel(row.date)}
            </p>
          </div>
        </div>
      ))}
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
