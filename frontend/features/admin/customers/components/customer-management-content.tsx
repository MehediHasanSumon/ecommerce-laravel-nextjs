"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Eye,
  RefreshCw,
  Search,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  customerManagementService,
  type CustomerDetail,
  type CustomerListItem,
  type CustomerStatus,
} from "@/features/admin/customers/services/customer-management-service";
import {
  FraudCheckModal,
  FraudRiskBadge,
} from "@/features/admin/fraud/components/fraud-check-modal";
import { fraudService } from "@/features/admin/fraud/services/fraud-service";
import type { FraudCheck } from "@/features/admin/fraud/types";
import type { PaginationMeta } from "@/features/admin/shared/types";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { formatPrice } from "@/utils/format";
import { cn } from "@/utils/cn";

const pageSizes = [10, 20, 50, 100];
const statuses = ["active", "inactive", "blocked"] as const;

function dateLabel(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value))
    : "Not set";
}

function title(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function CustomerManagementContent() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("created_at");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [fraudStatus, setFraudStatus] = useState("");
  const [fraudChecked, setFraudChecked] = useState("");
  const [fraudProvider, setFraudProvider] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [fraudTarget, setFraudTarget] = useState<CustomerListItem | null>(null);
  useAuthStore((state) => state.user?.permissions);
  const canCheckFraud = hasPermission("can_create_fraud_check");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await customerManagementService.list({
        search: appliedSearch,
        type,
        status,
        fraud_status: fraudStatus,
        fraud_checked: fraudChecked,
        fraud_provider: fraudProvider,
        sort,
        direction,
        page,
        per_page: perPage,
      });
      setCustomers(response.data.customers);
      setPagination(response.meta.pagination ?? null);
      setSelected([]);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [
    appliedSearch,
    direction,
    fraudChecked,
    fraudProvider,
    fraudStatus,
    page,
    perPage,
    sort,
    status,
    type,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  function sortBy(key: string) {
    setDirection(sort === key && direction === "asc" ? "desc" : "asc");
    setSort(key);
    setPage(1);
  }

  const allSelected =
    customers.length > 0 && customers.every((customer) => selected.includes(customer.id));

  async function bulkCheck(bypassCache: boolean) {
    const subjects = customers
      .filter((customer) => selected.includes(customer.id))
      .map((customer) => ({ type: customer.type, id: customer.record_id }));
    try {
      const response = await fraudService.bulk(subjects, bypassCache);
      toast.success(response.message || `${response.data.queued} fraud checks queued.`);
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  async function clearSelectedCache() {
    const selectedCustomers = customers.filter((customer) =>
      selected.includes(customer.id),
    );
    try {
      const response = await fraudService.clearCache({
        user_ids: selectedCustomers
          .filter((customer) => customer.type === "registered")
          .map((customer) => customer.record_id),
        guest_customer_ids: selectedCustomers
          .filter((customer) => customer.type === "guest")
          .map((customer) => customer.record_id),
      });
      toast.success(
        response.message || `${response.data.cleared} cached results cleared.`,
      );
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">Customer Management</span>
      </div>
      <section className="rounded-lg border border-border bg-card p-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Customer Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage registered and guest customers, order history, spending, and account
          status.
        </p>
      </section>
      <section className="rounded-lg border border-border bg-card p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_150px_150px_150px_150px_150px_auto]">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setAppliedSearch(search);
                  setPage(1);
                }
              }}
              placeholder="Search name, email, or phone"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <FilterSelect
            value={type}
            placeholder="All customer types"
            values={["registered", "guest"]}
            onChange={(value) => {
              setType(value);
              setPage(1);
            }}
          />
          <FilterSelect
            value={status}
            placeholder="All statuses"
            values={[...statuses]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <FilterSelect
            value={fraudStatus}
            placeholder="All fraud levels"
            values={["safe", "low", "medium", "high", "critical"]}
            onChange={(value) => {
              setFraudStatus(value);
              setPage(1);
            }}
          />
          <FilterSelect
            value={fraudChecked}
            placeholder="Fraud check status"
            values={["checked", "unchecked"]}
            onChange={(value) => {
              setFraudChecked(value);
              setPage(1);
            }}
          />
          <FilterSelect
            value={fraudProvider}
            placeholder="All fraud providers"
            values={["fraudpeek", "fraud_bd", "fraudbd"]}
            onChange={(value) => {
              setFraudProvider(value);
              setPage(1);
            }}
          />
          <Button
            size="sm"
            icon={<Search className="h-4 w-4" />}
            onClick={() => {
              setAppliedSearch(search);
              setPage(1);
            }}
          >
            Search
          </Button>
        </div>
      </section>
      {selected.length && canCheckFraud ? (
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">{selected.length} selected</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<ShieldCheck className="h-4 w-4" />}
              onClick={() => void bulkCheck(false)}
            >
              Bulk Check
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void bulkCheck(true)}
            >
              Bulk Refresh
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void clearSelectedCache()}
            >
              Clear Cache
            </Button>
          </div>
        </section>
      ) : null}
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(
                        allSelected ? [] : customers.map((customer) => customer.id),
                      )
                    }
                    aria-label="Select all customers"
                  />
                </th>
                <SortHead label="Customer" field="name" active={sort} onSort={sortBy} />
                <SortHead label="Email" field="email" active={sort} onSort={sortBy} />
                <SortHead label="Phone" field="phone" active={sort} onSort={sortBy} />
                <th className="px-4 py-3">Type</th>
                <SortHead
                  label="Orders"
                  field="total_orders"
                  active={sort}
                  onSort={sortBy}
                />
                <SortHead
                  label="Spending"
                  field="total_spending"
                  active={sort}
                  onSort={sortBy}
                />
                <SortHead
                  label="Last Order"
                  field="last_order_at"
                  active={sort}
                  onSort={sortBy}
                />
                <SortHead
                  label="Fraud"
                  field="fraud_score"
                  active={sort}
                  onSort={sortBy}
                />
                <SortHead label="Status" field="status" active={sort} onSort={sortBy} />
                <SortHead
                  label="Created"
                  field="created_at"
                  active={sort}
                  onSort={sortBy}
                />
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, row) => (
                  <tr key={row} className="border-t border-border">
                    {Array.from({ length: 12 }).map((__, cell) => (
                      <td key={cell} className="px-4 py-4">
                        <div className="h-5 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length ? (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-t border-border hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(customer.id)}
                        onChange={() =>
                          setSelected((current) =>
                            current.includes(customer.id)
                              ? current.filter((id) => id !== customer.id)
                              : [...current, customer.id],
                          )
                        }
                        aria-label={`Select ${customer.name}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold">{customer.name}</td>
                    <td className="px-4 py-3">{customer.email ?? "-"}</td>
                    <td className="px-4 py-3">{customer.phone ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-border px-2 py-1 text-xs font-semibold">
                        {title(customer.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{customer.total_orders}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatPrice(customer.total_spending)}
                    </td>
                    <td className="px-4 py-3">{dateLabel(customer.last_order_at)}</td>
                    <td className="px-4 py-3">
                      <FraudRiskBadge
                        level={customer.fraud_status}
                        score={customer.fraud_score}
                      />
                    </td>
                    <td className="px-4 py-3">{title(customer.status)}</td>
                    <td className="px-4 py-3">{dateLabel(customer.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Link href={`/admin/customers/${customer.id}`}>
                          <Button
                            size="icon"
                            variant="ghost"
                            icon={<Eye className="h-4 w-4" />}
                            aria-label={`View ${customer.name}`}
                            title="View customer"
                          />
                        </Link>
                        {canCheckFraud ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            icon={<ShieldCheck className="h-4 w-4" />}
                            aria-label={`Check fraud for ${customer.name}`}
                            title="Fraud check"
                            onClick={() => setFraudTarget(customer)}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="h-48 text-center">
                    <p className="font-semibold">No customers found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try changing the search or filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Total Records:{" "}
            <span className="font-semibold text-foreground">
              {pagination?.total ?? 0}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(perPage)}
              onValueChange={(value) => {
                setPerPage(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              icon={<ChevronLeft className="h-4 w-4" />}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm font-semibold">
              {page} / {pagination?.last_page ?? 1}
            </span>
            <Button
              size="sm"
              variant="secondary"
              icon={<ChevronRight className="h-4 w-4" />}
              disabled={page >= (pagination?.last_page ?? 1)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>
      <FraudCheckModal
        open={Boolean(fraudTarget)}
        onClose={() => setFraudTarget(null)}
        initial={
          fraudTarget
            ? {
                customer_id: fraudTarget.id,
                phone: fraudTarget.phone,
                name: fraudTarget.name,
                email: fraudTarget.email,
              }
            : undefined
        }
        onCompleted={() => void load()}
      />
    </div>
  );
}

export function CustomerDetailContent({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [status, setStatus] = useState<CustomerStatus>("active");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [fraudModalOpen, setFraudModalOpen] = useState(false);
  const [selectedFraudCheck, setSelectedFraudCheck] = useState<FraudCheck | null>(null);
  useAuthStore((state) => state.user?.permissions);
  const canEdit = hasPermission("can_edit_customer");
  const canCheckFraud = hasPermission("can_create_fraud_check");
  const canViewFraud = hasPermission("can_view_fraud_check");

  const load = useCallback(async () => {
    try {
      const response = await customerManagementService.show(customerId);
      setCustomer(response.data.customer);
      setStatus(response.data.customer.status);
      setNotes(response.data.customer.notes ?? "");
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }, [customerId]);
  useEffect(() => {
    void load();
  }, [load]);

  async function viewFraudCheck(checkId: string) {
    try {
      const response = await fraudService.show(checkId);
      setSelectedFraudCheck(response.data.check);
      setFraudModalOpen(true);
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  if (!customer) return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  const guestRecordId =
    customer.type === "guest" ? Number(customer.id.replace("guest-", "")) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {title(customer.type)} customer · Created {dateLabel(customer.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCheckFraud ? (
            <Button
              size="sm"
              icon={<ShieldCheck className="h-4 w-4" />}
              onClick={() => {
                setSelectedFraudCheck(null);
                setFraudModalOpen(true);
              }}
            >
              Fraud Check
            </Button>
          ) : null}
          <Link href="/admin/customers">
            <Button size="sm" variant="secondary">
              Back to Customers
            </Button>
          </Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Orders" value={String(customer.total_orders)} />
        <Metric
          label="Lifetime Spending"
          value={formatPrice(customer.lifetime_spending)}
        />
        <Metric label="Last Order" value={dateLabel(customer.last_order_at)} />
        <Metric
          label="Fraud Score"
          value={
            customer.fraud.risk_score === null
              ? "Unchecked"
              : `${customer.fraud.risk_score}/100`
          }
        />
      </div>
      <Panel title="Fraud Status">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <FraudRiskBadge
              level={customer.fraud.status}
              score={customer.fraud.risk_score}
            />
            <p className="text-sm text-muted-foreground">
              Last checked: {dateLabel(customer.fraud.last_checked_at)} Â· Total checks:{" "}
              {customer.fraud.total_checks}
            </p>
            <p className="text-sm text-muted-foreground">
              Providers:{" "}
              {customer.fraud.providers.length
                ? customer.fraud.providers.map(title).join(", ")
                : "None"}
            </p>
          </div>
          {canCheckFraud ? (
            <Button
              size="sm"
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => {
                setSelectedFraudCheck(null);
                setFraudModalOpen(true);
              }}
            >
              {customer.fraud.total_checks ? "Check Again" : "Run Check"}
            </Button>
          ) : null}
        </div>
        {customer.fraud.history.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Risk</th>
                  <th>Providers</th>
                  <th>Trigger</th>
                  <th>Status</th>
                  <th>Checked</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {customer.fraud.history.map((check) => (
                  <tr key={check.id} className="border-t border-border">
                    <td className="py-3">
                      <FraudRiskBadge level={check.risk_level} score={check.risk_score} />
                    </td>
                    <td>{check.providers.map(title).join(", ") || "-"}</td>
                    <td>{title(check.trigger)}</td>
                    <td>{title(check.status)}</td>
                    <td>{dateLabel(check.checked_at)}</td>
                    <td className="text-right">
                      {canViewFraud ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          icon={<Eye className="h-4 w-4" />}
                          aria-label="View fraud check"
                          title="View fraud check"
                          onClick={() => void viewFraudCheck(check.id)}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No fraud checks have been run for this customer.
          </p>
        )}
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Basic Information">
          <Info label="Name" value={customer.name} />
          <Info label="Email" value={customer.email} />
          <Info label="Phone" value={customer.phone} />
          <Info label="Status" value={title(customer.status)} />
        </Panel>
        <AddressPanel title="Billing Information" address={customer.billing_address} />
        <AddressPanel title="Shipping Information" address={customer.shipping_address} />
        {customer.type === "guest" ? (
          <Panel title="Guest Customer Management">
            <div className="space-y-3">
              <FilterSelect
                value={status}
                placeholder="Status"
                values={[...statuses]}
                onChange={(value) => setStatus(value as CustomerStatus)}
              />
              <textarea
                rows={5}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Internal customer notes"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <Button
                size="sm"
                icon={<Save className="h-4 w-4" />}
                disabled={!canEdit}
                isLoading={saving}
                onClick={async () => {
                  if (!guestRecordId) return;
                  setSaving(true);
                  try {
                    const response = await customerManagementService.updateGuest(
                      guestRecordId,
                      { status, notes: notes.trim() || null },
                    );
                    setCustomer(response.data.customer);
                    toast.success("Guest customer updated.");
                  } catch (error) {
                    toast.error(toAppError(error).message);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Save Customer
              </Button>
            </div>
          </Panel>
        ) : null}
      </div>
      <Panel title="Order History">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Order</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Date</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {customer.orders.length ? (
                customer.orders.map((order) => (
                  <tr key={order.id} className="border-t border-border">
                    <td className="py-3 font-semibold">{order.orderNumber}</td>
                    <td>{title(order.status)}</td>
                    <td>{title(order.paymentStatus)}</td>
                    <td>{formatPrice(order.summary.total)}</td>
                    <td>{dateLabel(order.placedAt)}</td>
                    <td className="text-right">
                      <Link href={`/admin/orders/${order.orderNumber}`}>
                        <Button
                          size="icon"
                          variant="ghost"
                          icon={<Eye className="h-4 w-4" />}
                          aria-label={`View ${order.orderNumber}`}
                        />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      <FraudCheckModal
        open={fraudModalOpen}
        onClose={() => {
          setFraudModalOpen(false);
          setSelectedFraudCheck(null);
        }}
        existing={selectedFraudCheck}
        initial={{
          customer_id: customer.id,
          phone: customer.phone,
          name: customer.name,
          email: customer.email,
          billing_address: customer.billing_address?.address_line,
          shipping_address: customer.shipping_address?.address_line,
        }}
        onCompleted={() => void load()}
      />
    </div>
  );
}

function FilterSelect({
  value,
  placeholder,
  values,
  onChange,
}: {
  value: string;
  placeholder: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      value={value || "all"}
      onValueChange={(next) => onChange(next === "all" ? "" : next)}
    >
      <SelectTrigger className="h-10 rounded-lg">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {values.map((item) => (
          <SelectItem key={item} value={item}>
            {title(item)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function SortHead({
  label,
  field,
  active,
  onSort,
}: {
  label: string;
  field: string;
  active: string;
  onSort: (field: string) => void;
}) {
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 font-bold"
      >
        {label}
        <ChevronsUpDown
          className={cn("h-3.5 w-3.5", active === field && "text-foreground")}
        />
      </button>
    </th>
  );
}
function Panel({
  title: heading,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 font-bold">{heading}</h2>
      {children}
    </section>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </section>
  );
}
function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words text-right font-medium">{value || "Not set"}</span>
    </div>
  );
}
function AddressPanel({
  title: heading,
  address,
}: {
  title: string;
  address: Record<string, string | null> | null;
}) {
  return (
    <Panel title={heading}>
      {address ? (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{address.full_name}</p>
          <p className="text-muted-foreground">
            {address.phone}
            {address.email ? ` · ${address.email}` : ""}
          </p>
          <p className="pt-2 text-muted-foreground">
            {[
              address.address_line,
              address.area,
              address.city,
              address.district,
              address.state,
              address.postal_code,
              address.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No address saved.</p>
      )}
    </Panel>
  );
}
