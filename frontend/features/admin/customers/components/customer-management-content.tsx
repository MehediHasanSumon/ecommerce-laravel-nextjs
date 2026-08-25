"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  User,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  customerManagementService,
  type CreateCustomerPayload,
  type CustomerDetail,
  type CustomerListItem,
  type CustomerStatus,
  type UpdateCustomerPayload,
} from "@/features/admin/customers/services/customer-management-service";
import type { PaginationMeta } from "@/features/admin/shared/types";
import { flattenValidationErrors, toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/utils/cn";
import { formatPrice } from "@/utils/format";

const pageSizes = [10, 20, 50, 100];

function formatDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value))
    : "—";
}

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "CU";
}

export function CustomerManagementContent() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [detailCustomer, setDetailCustomer] = useState<CustomerDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Add / Edit Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    mobile: string;
    email: string;
    address: string;
    status: CustomerStatus;
  }>({
    name: "",
    mobile: "",
    email: "",
    address: "",
    status: "active",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canView = hasPermission("can_view_customer");
  const canCreate = hasPermission("can_create_customer");
  const canEdit = hasPermission("can_edit_customer");
  const canDelete = hasPermission("can_delete_customer");

  const loadCustomers = useCallback(
    async (refresh = false) => {
      if (!canView) {
        setIsLoading(false);
        return;
      }

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await customerManagementService.list({
          search: search.trim() || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          per_page: pageSize,
          page: currentPage,
        });

        setCustomers(response.data.customers);
        setPagination(response.meta?.pagination ?? null);
      } catch (error) {
        toast.error(toAppError(error).message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [canView, search, statusFilter, pageSize, currentPage],
  );

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Load single customer detail for Drawer
  async function openDetailModal(id: number) {
    setIsDetailOpen(true);
    setIsDetailLoading(true);
    try {
      const response = await customerManagementService.show(id);
      setDetailCustomer(response.data.customer);
    } catch (error) {
      toast.error(toAppError(error).message);
      setIsDetailOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  }

  // Open Add modal
  function openCreateModal() {
    setFormMode("create");
    setEditingCustomer(null);
    setFormData({
      name: "",
      mobile: "",
      email: "",
      address: "",
      status: "active",
    });
    setFormErrors({});
    setIsFormOpen(true);
  }

  // Open Edit modal
  function openEditModal(customer: CustomerListItem) {
    setFormMode("edit");
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email || "",
      address: customer.address || "",
      status: customer.status,
    });
    setFormErrors({});
    setIsFormOpen(true);
  }

  // Save Customer (Create or Update)
  async function handleSaveCustomer(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = "Customer name is required.";
    }
    if (!formData.mobile.trim()) {
      errors.mobile = "Mobile number is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (formMode === "create") {
        const payload: CreateCustomerPayload = {
          name: formData.name.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          status: formData.status,
        };
        await customerManagementService.create(payload);
        toast.success("Customer created successfully.");
      } else if (editingCustomer) {
        const payload: UpdateCustomerPayload = {
          name: formData.name.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          status: formData.status,
        };
        await customerManagementService.update(editingCustomer.id, payload);
        toast.success("Customer updated successfully.");
      }

      setIsFormOpen(false);
      loadCustomers(true);
    } catch (error) {
      const appErr = toAppError(error);
      if (appErr.validationErrors) {
        setFormErrors(flattenValidationErrors(appErr.validationErrors));
      }
      toast.error(appErr.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Open delete confirm
  function openDeleteDialog(customer: CustomerListItem) {
    setDeletingCustomer(customer);
    setIsDeleteOpen(true);
  }

  // Confirm delete
  async function handleConfirmDelete() {
    if (!deletingCustomer) return;
    setIsDeleting(true);
    try {
      await customerManagementService.delete(deletingCustomer.id);
      toast.success("Customer deleted successfully.");
      setIsDeleteOpen(false);
      setDeletingCustomer(null);
      loadCustomers(true);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage buyer profiles, contact information, and account status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadCustomers(true)}
            disabled={isRefreshing || isLoading}
            icon={<RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />}
          >
            Refresh
          </Button>
          {canCreate && (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search customer name or mobile number..."
            className="pl-9"
          />
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Status:</span>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Customer Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Mobile Number</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="inline-flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading customers...</span>
                  </div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <User className="h-8 w-8 text-muted-foreground/50" />
                    <p className="font-medium text-foreground">No customers found</p>
                    <p className="text-xs">Try adjusting your search or status filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} className="transition-colors hover:bg-muted/30">
                  {/* Customer (Avatar + Name + Email) */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(customer.name)}
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => openDetailModal(customer.id)}
                          className="font-medium text-foreground hover:text-primary hover:underline text-left block truncate"
                        >
                          {customer.name}
                        </button>
                        {customer.email && (
                          <span className="text-xs text-muted-foreground truncate block">
                            {customer.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Mobile Number */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-foreground font-mono text-xs">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{customer.mobile}</span>
                    </div>
                  </td>

                  {/* Address */}
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate text-xs">
                    {customer.address || "—"}
                  </td>

                  {/* Due */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "font-medium text-xs",
                        customer.due > 0
                          ? "text-destructive font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatPrice(customer.due)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        customer.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {customer.status === "active" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      <span className="capitalize">{customer.status}</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="View Customer"
                        onClick={() => openDetailModal(customer.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Edit Customer"
                          onClick={() => openEditModal(customer)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete Customer"
                          onClick={() => openDeleteDialog(customer)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row text-xs text-muted-foreground">
            <div>
              Showing <span className="font-medium text-foreground">{pagination.from || 1}</span> to{" "}
              <span className="font-medium text-foreground">{pagination.to || customers.length}</span> of{" "}
              <span className="font-medium text-foreground">{pagination.total}</span> customers
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pageSizes.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-medium text-foreground">
                  {currentPage} / {pagination.last_page}
                </span>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage >= pagination.last_page}
                  onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT CUSTOMER MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => !isSubmitting && setIsFormOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl z-10">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {formMode === "create" ? "Add New Customer" : "Edit Customer"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => !isSubmitting && setIsFormOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveCustomer} className="mt-4 space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahim Ahmed"
                  required
                />
                {formErrors.name && (
                  <p className="text-xs text-destructive">{formErrors.name}</p>
                )}
              </div>

              {/* Mobile */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Mobile Number <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="e.g. 01711000000"
                  required
                />
                {formErrors.mobile && (
                  <p className="text-xs text-destructive">{formErrors.mobile}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Email Address <span className="text-muted-foreground">(Optional)</span>
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. rahim@example.com"
                />
                {formErrors.email && (
                  <p className="text-xs text-destructive">{formErrors.email}</p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Address <span className="text-muted-foreground">(Optional)</span>
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. House 14, Road 5, Dhanmondi, Dhaka"
                  rows={2}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {formErrors.address && (
                  <p className="text-xs text-destructive">{formErrors.address}</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val as CustomerStatus })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                >
                  {formMode === "create" ? "Save Customer" : "Update Customer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW CUSTOMER DRAWER / MODAL */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsDetailOpen(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl z-10">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {detailCustomer ? getInitials(detailCustomer.name) : "CU"}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {detailCustomer?.name || "Customer Details"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Mobile: {detailCustomer?.mobile}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setIsDetailOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {isDetailLoading ? (
              <div className="py-16 text-center text-muted-foreground">
                <RefreshCw className="mx-auto h-6 w-6 animate-spin" />
                <p className="mt-2 text-xs">Loading customer profile...</p>
              </div>
            ) : detailCustomer ? (
              <div className="mt-6 space-y-6">
                {/* Metric cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {detailCustomer.total_orders}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Lifetime Spent</p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {formatPrice(detailCustomer.total_spent)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Current Due</p>
                    <p
                      className={cn(
                        "mt-1 text-lg font-bold",
                        detailCustomer.due > 0 ? "text-destructive" : "text-foreground",
                      )}
                    >
                      {formatPrice(detailCustomer.due)}
                    </p>
                  </div>
                </div>

                {/* Profile Information */}
                <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block">Email:</span>
                      <span className="font-medium text-foreground">
                        {detailCustomer.email || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Status:</span>
                      <span className="font-medium capitalize text-foreground">
                        {detailCustomer.status}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground block">Address:</span>
                    <span className="font-medium text-foreground">
                      {detailCustomer.address || "—"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground block">Customer Since:</span>
                    <span className="font-medium text-foreground">
                      {formatDate(detailCustomer.created_at)}
                    </span>
                  </div>
                </div>

                {/* Order History */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    <span>Order History ({detailCustomer.orders?.length || 0})</span>
                  </h3>

                  {!detailCustomer.orders || detailCustomer.orders.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center border rounded-lg">
                      No orders placed yet.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 text-muted-foreground font-semibold">
                          <tr>
                            <th className="px-3 py-2">Order #</th>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Total</th>
                            <th className="px-3 py-2">Payment</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {detailCustomer.orders.map((order) => (
                            <tr key={order.id} className="hover:bg-muted/20">
                              <td className="px-3 py-2 font-mono">
                                <Link
                                  href={`/admin/orders/${order.id}`}
                                  className="text-primary hover:underline"
                                >
                                  {order.orderNumber}
                                </Link>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {formatDate(order.placedAt)}
                              </td>
                              <td className="px-3 py-2 font-medium">
                                {formatPrice(order.summary?.total ?? 0)}
                              </td>
                              <td className="px-3 py-2 capitalize text-muted-foreground">
                                {order.paymentStatus}
                              </td>
                              <td className="px-3 py-2 capitalize font-medium">
                                {order.status}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <DeleteConfirmationDialog
        open={isDeleteOpen}
        title="Delete Customer"
        message={`Are you sure you want to delete customer '${deletingCustomer?.name}'? Customers with orders cannot be deleted.`}
        isProcessing={isDeleting}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export function CustomerDetailContent({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const response = await customerManagementService.show(customerId);
        setCustomer(response.data.customer);
      } catch (error) {
        toast.error(toAppError(error).message);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [customerId]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push("/admin/customers")}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to Customers
        </Button>
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Customer not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push("/admin/customers")}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{customer.name}</h1>
          <p className="text-xs text-muted-foreground font-mono">Mobile: {customer.mobile}</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Orders</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{customer.total_orders}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Lifetime Spent</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatPrice(customer.total_spent)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Current Due</p>
          <p className={cn("mt-1 text-2xl font-bold", customer.due > 0 ? "text-destructive" : "text-foreground")}>
            {formatPrice(customer.due)}
          </p>
        </div>
      </div>

      {/* Details Card */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3 text-sm">
        <h2 className="font-semibold text-foreground">Customer Profile</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
          <div>
            <span className="text-muted-foreground block">Email:</span>
            <span className="font-medium text-foreground">{customer.email || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Status:</span>
            <span className="font-medium capitalize text-foreground">{customer.status}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Address:</span>
            <span className="font-medium text-foreground">{customer.address || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Customer Since:</span>
            <span className="font-medium text-foreground">{formatDate(customer.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground mb-4">Orders ({customer.orders?.length || 0})</h2>
        {!customer.orders || customer.orders.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No orders found for this customer.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customer.orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono">
                      <Link href={`/admin/orders/${order.id}`} className="text-primary hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(order.placedAt)}</td>
                    <td className="px-4 py-3 font-medium">{formatPrice(order.summary?.total ?? 0)}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{order.paymentStatus}</td>
                    <td className="px-4 py-3 capitalize font-medium">{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
