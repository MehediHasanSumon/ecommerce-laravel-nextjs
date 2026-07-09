"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Edit3,
  Filter,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { permissionService } from "@/features/admin/permissions/services/permission-service";
import { roleService } from "@/features/admin/roles/services/role-service";
import { useUrlQueryState } from "@/features/admin/shared/hooks/use-url-query-state";
import { userService } from "@/features/admin/users/services/user-service";
import { toAppError } from "@/lib/errors";
import { cn } from "@/utils/cn";
import { TableSkeleton } from "@/components/ui/skeleton";
import type { Option, PaginationMeta } from "@/features/admin/shared/types";
import type { ManagedPermission } from "@/features/admin/permissions/types";
import type { ManagedRole } from "@/features/admin/roles/types";
import type { ManagedUser, UserStatus } from "@/features/admin/users/types";

const statuses: UserStatus[] = ["active", "deactive", "suspended", "disabled"];
const pageSizes = [10, 20, 50, 100];

type SortDirection = "asc" | "desc";
type Resource = "users" | "roles" | "permissions";
type DrawerMode = "create" | "edit";

type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  sortKey?: string;
  className?: string;
  render: (item: T) => ReactNode;
};

type Filters = {
  status: string;
  role: string;
  email_verified: string;
  created_from: string;
  created_to: string;
  updated_from: string;
  updated_to: string;
};

const emptyFilters: Filters = {
  status: "",
  role: "",
  email_verified: "",
  created_from: "",
  created_to: "",
  updated_from: "",
  updated_to: "",
};

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().optional(),
  password_confirmation: z.string().optional(),
  status: z.enum(["active", "deactive", "suspended", "disabled"]),
  email_verified_at: z.string().optional(),
  roles: z.array(z.string()),
}).superRefine((data, context) => {
  if (data.password && data.password.length < 8) {
    context.addIssue({ code: "custom", path: ["password"], message: "Password must be at least 8 characters." });
  }

  if (data.password !== data.password_confirmation) {
    context.addIssue({ code: "custom", path: ["password_confirmation"], message: "Passwords do not match." });
  }
});

const roleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters."),
  permissions: z.array(z.string()),
});

const permissionSchema = z.object({
  name: z.string().min(2, "Permission name must be at least 2 characters."),
});

type UserFormValues = z.infer<typeof userSchema>;
type RoleFormValues = z.infer<typeof roleSchema>;
type PermissionFormValues = z.infer<typeof permissionSchema>;

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: UserStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function exportRows(filename: string, rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Drawer({
  title,
  description,
  open,
  children,
  onClose,
}: {
  title: string;
  description: string;
  open: boolean;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[70] transition",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        className={cn("absolute inset-0 bg-black/50 transition-opacity", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
        aria-label="Close drawer backdrop"
        type="button"
      />
      <aside
        className={cn(
          "absolute bottom-0 right-0 top-0 flex w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 sm:w-[34rem]",
          open ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="management-drawer-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id="management-drawer-title" className="text-lg font-bold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <Button variant="ghost" size="icon" icon={<X className="h-4 w-4" />} aria-label="Close drawer" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

function FilterModal({
  open,
  filters,
  roles,
  showUserFilters,
  onClose,
  onApply,
}: {
  open: boolean;
  filters: Filters;
  roles: Option[];
  showUserFilters: boolean;
  onClose: () => void;
  onApply: (filters: Filters) => void;
}) {
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close filters" type="button" />
      <div className="relative w-full max-w-2xl rounded-lg border border-border bg-background p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Advanced Filter</h2>
            <p className="mt-1 text-sm text-muted-foreground">Refine records by status, assignment, verification, and dates.</p>
          </div>
          <Button variant="ghost" size="icon" icon={<X className="h-4 w-4" />} aria-label="Close filters" onClick={onClose} />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {showUserFilters ? (
            <>
              <label className="space-y-2 text-sm font-semibold">
                <span>Status</span>
                <Select value={draft.status} onValueChange={(value) => setDraft({ ...draft, status: value })}>
                  <SelectTrigger className="h-11 rounded-lg px-3 text-sm">
                    <SelectValue placeholder="Any status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any status</SelectItem>
                    {statuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>Role</span>
                <Select value={draft.role} onValueChange={(value) => setDraft({ ...draft, role: value })}>
                  <SelectTrigger className="h-11 rounded-lg px-3 text-sm">
                    <SelectValue placeholder="Any role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any role</SelectItem>
                    {roles.map((role) => <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>Email Verified</span>
                <Select value={draft.email_verified} onValueChange={(value) => setDraft({ ...draft, email_verified: value })}>
                  <SelectTrigger className="h-11 rounded-lg px-3 text-sm">
                    <SelectValue placeholder="Any state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any state</SelectItem>
                    <SelectItem value="yes">Verified</SelectItem>
                    <SelectItem value="no">Not verified</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </>
          ) : null}
          <DatePicker label="Created From" value={draft.created_from || null} onChange={(value) => setDraft({ ...draft, created_from: value })} />
          <DatePicker label="Created To" value={draft.created_to || null} onChange={(value) => setDraft({ ...draft, created_to: value })} />
          <DatePicker label="Updated From" value={draft.updated_from || null} onChange={(value) => setDraft({ ...draft, updated_from: value })} />
          <DatePicker label="Updated To" value={draft.updated_to || null} onChange={(value) => setDraft({ ...draft, updated_to: value })} />
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button size="sm" variant="secondary" onClick={() => setDraft(emptyFilters)}>Reset Filters</Button>
          <Button size="sm" onClick={() => onApply(draft)}>Apply Filters</Button>
        </div>
      </div>
    </div>
  );
}

function MultiCheckbox({
  options,
  values,
  onChange,
}: {
  options: Array<{ id: number; name: string }>;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="rounded-lg border border-border p-2">
      <div className="grid max-h-44 gap-1 overflow-y-auto pr-1">
        {options.length ? options.map((option) => {
          const checked = values.includes(option.name);
          return (
            <label key={option.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? values.filter((value) => value !== option.name) : [...values, option.name])}
                className="h-4 w-4 rounded border-border"
              />
              <span>{option.name}</span>
            </label>
          );
        }) : (
          <p className="px-2 py-2 text-sm text-muted-foreground">No options available.</p>
        )}
      </div>
    </div>
  );
}

function UserForm({
  user,
  roles,
  mode,
  onCancel,
  onSubmit,
}: {
  user?: ManagedUser | null;
  roles: Option[];
  mode: DrawerMode;
  onCancel: () => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
}) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    values: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      password_confirmation: "",
      status: user?.status ?? "active",
      email_verified_at: user?.email_verified_at ? user.email_verified_at.slice(0, 10) : "",
      roles: user?.roles.map((role) => role.name) ?? [],
    },
  });
  const selectedRoles = useWatch({ control: form.control, name: "roles" });
  const selectedStatus = useWatch({ control: form.control, name: "status" });
  const emailVerifiedAt = useWatch({ control: form.control, name: "email_verified_at" });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Input label="Name" className="h-10 rounded-lg" {...form.register("name")} error={form.formState.errors.name?.message} />
      <Input label="Email" type="email" className="h-10 rounded-lg" {...form.register("email")} error={form.formState.errors.email?.message} />
      <Input label={mode === "create" ? "Password" : "Password (leave blank to keep current)"} type="password" className="h-10 rounded-lg" {...form.register("password")} error={form.formState.errors.password?.message} />
      <Input label="Confirm Password" type="password" className="h-10 rounded-lg" {...form.register("password_confirmation")} error={form.formState.errors.password_confirmation?.message} />
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Status</span>
        <Select value={selectedStatus} onValueChange={(value) => form.setValue("status", value as UserStatus, { shouldDirty: true })}>
          <SelectTrigger className="h-10 rounded-lg px-3 text-sm">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>
      <DatePicker label="Email Verified At" value={emailVerifiedAt || null} onChange={(value) => form.setValue("email_verified_at", value, { shouldDirty: true })} />
      <div className="space-y-1.5">
        <p className="text-sm font-semibold">Roles</p>
        <MultiCheckbox options={roles} values={selectedRoles} onChange={(values) => form.setValue("roles", values, { shouldDirty: true })} />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" isLoading={form.formState.isSubmitting}>{mode === "create" ? "Create User" : "Save Changes"}</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function RoleForm({
  role,
  permissions,
  mode,
  onCancel,
  onSubmit,
}: {
  role?: ManagedRole | null;
  permissions: Option[];
  mode: DrawerMode;
  onCancel: () => void;
  onSubmit: (values: RoleFormValues) => Promise<void>;
}) {
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    values: {
      name: role?.name ?? "",
      permissions: role?.permissions.map((permission) => permission.name) ?? [],
    },
  });
  const selectedPermissions = useWatch({ control: form.control, name: "permissions" });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Input label="Role Name" className="h-10 rounded-lg" {...form.register("name")} error={form.formState.errors.name?.message} />
      <div className="space-y-1.5">
        <p className="text-sm font-semibold">Permissions</p>
        <MultiCheckbox options={permissions} values={selectedPermissions} onChange={(values) => form.setValue("permissions", values, { shouldDirty: true })} />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" isLoading={form.formState.isSubmitting}>{mode === "create" ? "Create Role" : "Save Changes"}</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function PermissionForm({
  permission,
  mode,
  onCancel,
  onSubmit,
}: {
  permission?: ManagedPermission | null;
  mode: DrawerMode;
  onCancel: () => void;
  onSubmit: (values: PermissionFormValues) => Promise<void>;
}) {
  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionSchema),
    values: { name: permission?.name ?? "" },
  });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Input label="Permission Name" className="h-10 rounded-lg" {...form.register("name")} error={form.formState.errors.name?.message} />
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" isLoading={form.formState.isSubmitting}>{mode === "create" ? "Create Permission" : "Save Changes"}</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function ManagementPage<T extends { id: number }>({
  resource,
  title,
  description,
  createLabel,
  data,
  pagination,
  columns,
  loading,
  selected,
  sort,
  search,
  filters,
  roles,
  onSort,
  onSearch,
  onFilter,
  onPage,
  onPerPage,
  onToggle,
  onToggleAll,
  onCreate,
  onEdit,
  onDelete,
  onBulkDelete,
  onExport,
}: {
  resource: Resource;
  title: string;
  description: string;
  createLabel: string;
  data: T[];
  pagination: PaginationMeta | null;
  columns: Column<T>[];
  loading: boolean;
  selected: number[];
  sort: string;
  direction: SortDirection;
  search: string;
  filters: Filters;
  roles: Option[];
  onSort: (key: string) => void;
  onSearch: (value: string) => void;
  onFilter: (value: Filters) => void;
  onPage: (page: number) => void;
  onPerPage: (value: number) => void;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onCreate: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onBulkDelete: () => void;
  onExport: () => void;
}) {
  const [searchInput, setSearchInput] = useState(search);
  const [filterOpen, setFilterOpen] = useState(false);
  const allSelected = data.length > 0 && data.every((item) => selected.includes(item.id));
  const page = pagination?.current_page ?? 1;
  const lastPage = pagination?.last_page ?? 1;
  const tableColumns = useMemo<ColumnDef<T>[]>(() => columns.map((column) => ({
    id: column.key,
    header: column.label,
    cell: ({ row }) => column.render(row.original),
  })), [columns]);
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span>
        <ChevronRight className="h-4 w-4" />
        <span>Users Management</span>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{title}</span>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={onCreate}>{createLabel}</Button>
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && onSearch(searchInput)}
              placeholder={`Search ${resource}...`}
              className="h-9 min-w-0 flex-1 bg-transparent text-sm"
            />
          </div>
          <Button size="sm" variant="secondary" icon={<Search className="h-4 w-4" />} onClick={() => onSearch(searchInput)}>Search</Button>
          <Button size="sm" variant="secondary" icon={<Filter className="h-4 w-4" />} onClick={() => setFilterOpen(true)}>Advanced Filter</Button>
        </div>
      </section>

      {selected.length ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-primary px-4 py-3 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">{selected.length} selected</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} onClick={onExport}>Export</Button>
            <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={onBulkDelete}>Bulk Delete</Button>
          </div>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Select all rows" />
                </th>
                {columns.map((column) => (
                  <th key={column.key} className={cn("px-4 py-3 font-bold", column.className)}>
                    {column.sortable ? (
                      <button className="inline-flex items-center gap-1" onClick={() => onSort(column.sortKey ?? column.key)} type="button">
                        {column.label}
                        <ChevronsUpDown className={cn("h-3.5 w-3.5", sort === (column.sortKey ?? column.key) && "text-foreground")} />
                      </button>
                    ) : column.label}
                  </th>
                ))}
                <th className="w-28 px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={6} columns={columns.length} selectable actions />
              ) : table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => {
                const item = row.original;
                return (
                <tr key={item.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} aria-label={`Select row ${item.id}`} />
                  </td>
                  {row.getVisibleCells().map((cell, index) => (
                    <td key={cell.id} className={cn("px-4 py-3 align-middle", columns[index]?.className)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" icon={<Edit3 className="h-4 w-4" />} title="Edit" aria-label="Edit" onClick={() => onEdit(item)} />
                      <Button variant="ghost" size="icon" icon={<Trash2 className="h-4 w-4" />} title="Delete" aria-label="Delete" onClick={() => onDelete(item)} />
                    </div>
                  </td>
                </tr>
              );
              }) : (
                <tr>
                  <td colSpan={columns.length + 2} className="h-48 text-center">
                    <div className="mx-auto max-w-sm">
                      <p className="font-semibold">No records found</p>
                      <p className="mt-1 text-sm text-muted-foreground">Try changing filters or create a new record.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Total Records: <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(pagination?.per_page ?? 10)} onValueChange={(value) => onPerPage(Number(value))}>
              <SelectTrigger className="h-9 w-[110px] rounded-lg px-2 text-sm" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((size) => <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="secondary" size="sm" icon={<ChevronLeft className="h-4 w-4" />} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
            {Array.from({ length: Math.min(lastPage, 5) }, (_, index) => {
              const start = Math.max(1, Math.min(page - 2, lastPage - 4));
              const pageNumber = start + index;
              if (pageNumber > lastPage) return null;
              return (
                <Button key={pageNumber} variant={pageNumber === page ? "primary" : "secondary"} size="sm" onClick={() => onPage(pageNumber)}>{pageNumber}</Button>
              );
            })}
            <Button variant="secondary" size="sm" icon={<ChevronRight className="h-4 w-4" />} disabled={page >= lastPage} onClick={() => onPage(page + 1)}>Next</Button>
          </div>
        </div>
      </section>

      <FilterModal
        open={filterOpen}
        filters={filters}
        roles={roles}
        showUserFilters={resource === "users"}
        onClose={() => setFilterOpen(false)}
        onApply={(value) => {
          onFilter(value);
          setFilterOpen(false);
        }}
      />
    </div>
  );
}

export function UserManagementContent() {
  const { query, setQuery } = useUrlQueryState("created_at");
  const [items, setItems] = useState<ManagedUser[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [roles, setRoles] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const page = query.page;
  const perPage = query.per_page;
  const search = query.search;
  const sort = query.sort;
  const direction = query.direction;
  const filters = useMemo(() => ({
    status: query.status,
    role: query.role,
    email_verified: query.email_verified,
    created_from: query.created_from,
    created_to: query.created_to,
    updated_from: query.updated_from,
    updated_to: query.updated_to,
  }), [query.created_from, query.created_to, query.email_verified, query.role, query.status, query.updated_from, query.updated_to]);
  const [selected, setSelected] = useState<number[]>([]);
  const [drawer, setDrawer] = useState<{ open: boolean; mode: DrawerMode; item: ManagedUser | null }>({ open: false, mode: "create", item: null });
  const { confirmDelete, deleteConfirmationDialog } = useDeleteConfirmation();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userService.list({ page, per_page: perPage, search, sort, direction, ...filters });
      setItems(response.data.users);
      setPagination(response.meta.pagination ?? null);
      setRoles(response.data.roles);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [direction, filters, page, perPage, search, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo<Column<ManagedUser>[]>(() => [
    { key: "name", label: "Name", sortable: true, render: (user) => <span className="font-semibold">{user.name}</span> },
    { key: "email", label: "Email", sortable: true, render: (user) => user.email },
    { key: "roles", label: "Roles", render: (user) => <div className="flex flex-wrap gap-1">{user.roles.length ? user.roles.map((role) => <span key={role.id} className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{role.name}</span>) : <span className="text-muted-foreground">None</span>}</div> },
    { key: "status", label: "Status", sortable: true, render: (user) => <span className="rounded-full border border-border px-2 py-1 text-xs font-bold">{statusLabel(user.status)}</span> },
    { key: "email_verified_at", label: "Email Verified", sortable: true, render: (user) => formatDate(user.email_verified_at) },
    { key: "created_at", label: "Created At", sortable: true, render: (user) => formatDate(user.created_at) },
  ], []);

  async function submit(values: UserFormValues) {
    const payload = { ...values, email_verified_at: values.email_verified_at || null };
    try {
      if (drawer.mode === "create") {
        await userService.create(payload);
        toast.success("User created successfully.");
      } else if (drawer.item) {
        await userService.update(drawer.item.id, payload);
        toast.success("User updated successfully.");
      }
      setDrawer({ open: false, mode: "create", item: null });
      await load();
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  return (
    <>
      <ManagementPage
        resource="users"
        title="User Management"
        description="Manage system users, assign roles, and control account status."
        createLabel="Create User"
        data={items}
        pagination={pagination}
        columns={columns}
        loading={loading}
        selected={selected}
        sort={sort}
        direction={direction}
        search={search}
        filters={filters}
        roles={roles}
        onSort={(key) => setQuery({ sort: key, direction: sort === key && direction === "asc" ? "desc" : "asc", page: 1 })}
        onSearch={(value) => setQuery({ search: value, page: 1 })}
        onFilter={(value) => setQuery({ ...value, page: 1 })}
        onPage={(value) => setQuery({ page: value })}
        onPerPage={(value) => setQuery({ per_page: value, page: 1 })}
        onToggle={(id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
        onToggleAll={() => setSelected((current) => items.every((item) => current.includes(item.id)) ? [] : items.map((item) => item.id))}
        onCreate={() => setDrawer({ open: true, mode: "create", item: null })}
        onEdit={(item) => setDrawer({ open: true, mode: "edit", item })}
        onDelete={(item) => confirmDelete({
          title: "Confirm Deletion",
          onConfirm: async () => {
            await userService.delete(item.id);
            toast.success("User deleted.");
            await load();
          },
        })}
        onBulkDelete={() => confirmDelete({
          title: "Confirm Deletion",
          onConfirm: async () => {
            await userService.bulkDelete(selected);
            setSelected([]);
            toast.success("Selected users deleted.");
            await load();
          },
        })}
        onExport={() => exportRows("users.csv", items.filter((item) => selected.includes(item.id)).map((user) => ({ name: user.name, email: user.email, status: user.status, roles: user.roles.map((role) => role.name).join("; ") })))}
      />
      {deleteConfirmationDialog}
      <Drawer open={drawer.open} title={drawer.mode === "create" ? "Create User" : "Edit User"} description="Use Spatie roles to control access for this account." onClose={() => setDrawer({ open: false, mode: "create", item: null })}>
        <UserForm mode={drawer.mode} user={drawer.item} roles={roles} onCancel={() => setDrawer({ open: false, mode: "create", item: null })} onSubmit={submit} />
      </Drawer>
    </>
  );
}

export function RoleManagementContent() {
  const { query, setQuery } = useUrlQueryState("created_at");
  const [items, setItems] = useState<ManagedRole[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [permissions, setPermissions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const page = query.page;
  const perPage = query.per_page;
  const search = query.search;
  const sort = query.sort;
  const direction = query.direction;
  const filters = useMemo(() => ({
    ...emptyFilters,
    created_from: query.created_from,
    created_to: query.created_to,
    updated_from: query.updated_from,
    updated_to: query.updated_to,
  }), [query.created_from, query.created_to, query.updated_from, query.updated_to]);
  const [selected, setSelected] = useState<number[]>([]);
  const [drawer, setDrawer] = useState<{ open: boolean; mode: DrawerMode; item: ManagedRole | null }>({ open: false, mode: "create", item: null });
  const { confirmDelete, deleteConfirmationDialog } = useDeleteConfirmation();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await roleService.list({ page, per_page: perPage, search, sort, direction, ...filters });
      setItems(response.data.roles);
      setPagination(response.meta.pagination ?? null);
      setPermissions(response.data.permissions);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [direction, filters, page, perPage, search, sort]);

  useEffect(() => { void load(); }, [load]);

  const columns = useMemo<Column<ManagedRole>[]>(() => [
    { key: "name", label: "Role Name", sortable: true, render: (role) => <span className="font-semibold">{role.name}</span> },
    { key: "permissions_count", label: "Permissions Count", render: (role) => role.permissions_count },
    { key: "created_at", label: "Created At", sortable: true, render: (role) => formatDate(role.created_at) },
  ], []);

  async function submit(values: RoleFormValues) {
    try {
      if (drawer.mode === "create") {
        await roleService.create(values);
        toast.success("Role created successfully.");
      } else if (drawer.item) {
        await roleService.update(drawer.item.id, values);
        toast.success("Role updated successfully.");
      }
      setDrawer({ open: false, mode: "create", item: null });
      await load();
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  return (
    <>
      <ManagementPage
        resource="roles"
        title="Role Management"
        description="Create roles and attach multiple permissions through Spatie Laravel Permission."
        createLabel="Create Role"
        data={items}
        pagination={pagination}
        columns={columns}
        loading={loading}
        selected={selected}
        sort={sort}
        direction={direction}
        search={search}
        filters={filters}
        roles={[]}
        onSort={(key) => setQuery({ sort: key, direction: sort === key && direction === "asc" ? "desc" : "asc", page: 1 })}
        onSearch={(value) => setQuery({ search: value, page: 1 })}
        onFilter={(value) => setQuery({ ...value, page: 1 })}
        onPage={(value) => setQuery({ page: value })}
        onPerPage={(value) => setQuery({ per_page: value, page: 1 })}
        onToggle={(id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
        onToggleAll={() => setSelected((current) => items.every((item) => current.includes(item.id)) ? [] : items.map((item) => item.id))}
        onCreate={() => setDrawer({ open: true, mode: "create", item: null })}
        onEdit={(item) => setDrawer({ open: true, mode: "edit", item })}
        onDelete={(item) => confirmDelete({
          title: "Confirm Deletion",
          onConfirm: async () => {
            await roleService.delete(item.id);
            toast.success("Role deleted.");
            await load();
          },
        })}
        onBulkDelete={() => confirmDelete({
          title: "Confirm Deletion",
          onConfirm: async () => {
            await roleService.bulkDelete(selected);
            setSelected([]);
            toast.success("Selected roles deleted.");
            await load();
          },
        })}
        onExport={() => exportRows("roles.csv", items.filter((item) => selected.includes(item.id)).map((role) => ({ name: role.name, permissions_count: role.permissions_count })))}
      />
      {deleteConfirmationDialog}
      <Drawer open={drawer.open} title={drawer.mode === "create" ? "Create Role" : "Edit Role"} description="Attach permissions that define what this role can access." onClose={() => setDrawer({ open: false, mode: "create", item: null })}>
        <RoleForm mode={drawer.mode} role={drawer.item} permissions={permissions} onCancel={() => setDrawer({ open: false, mode: "create", item: null })} onSubmit={submit} />
      </Drawer>
    </>
  );
}

export function PermissionManagementContent() {
  const { query, setQuery } = useUrlQueryState("created_at");
  const [items, setItems] = useState<ManagedPermission[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const page = query.page;
  const perPage = query.per_page;
  const search = query.search;
  const sort = query.sort;
  const direction = query.direction;
  const filters = useMemo(() => ({
    ...emptyFilters,
    created_from: query.created_from,
    created_to: query.created_to,
    updated_from: query.updated_from,
    updated_to: query.updated_to,
  }), [query.created_from, query.created_to, query.updated_from, query.updated_to]);
  const [selected, setSelected] = useState<number[]>([]);
  const [drawer, setDrawer] = useState<{ open: boolean; mode: DrawerMode; item: ManagedPermission | null }>({ open: false, mode: "create", item: null });
  const { confirmDelete, deleteConfirmationDialog } = useDeleteConfirmation();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await permissionService.list({ page, per_page: perPage, search, sort, direction, ...filters });
      setItems(response.data.permissions);
      setPagination(response.meta.pagination ?? null);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [direction, filters, page, perPage, search, sort]);

  useEffect(() => { void load(); }, [load]);

  const columns = useMemo<Column<ManagedPermission>[]>(() => [
    { key: "name", label: "Permission Name", sortable: true, render: (permission) => <span className="font-semibold">{permission.name}</span> },
    { key: "created_at", label: "Created At", sortable: true, render: (permission) => formatDate(permission.created_at) },
  ], []);

  async function submit(values: PermissionFormValues) {
    try {
      if (drawer.mode === "create") {
        await permissionService.create(values);
        toast.success("Permission created successfully.");
      } else if (drawer.item) {
        await permissionService.update(drawer.item.id, values);
        toast.success("Permission updated successfully.");
      }
      setDrawer({ open: false, mode: "create", item: null });
      await load();
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  return (
    <>
      <ManagementPage
        resource="permissions"
        title="Permission Management"
        description="Maintain permission records used by roles and access checks."
        createLabel="Create Permission"
        data={items}
        pagination={pagination}
        columns={columns}
        loading={loading}
        selected={selected}
        sort={sort}
        direction={direction}
        search={search}
        filters={filters}
        roles={[]}
        onSort={(key) => setQuery({ sort: key, direction: sort === key && direction === "asc" ? "desc" : "asc", page: 1 })}
        onSearch={(value) => setQuery({ search: value, page: 1 })}
        onFilter={(value) => setQuery({ ...value, page: 1 })}
        onPage={(value) => setQuery({ page: value })}
        onPerPage={(value) => setQuery({ per_page: value, page: 1 })}
        onToggle={(id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
        onToggleAll={() => setSelected((current) => items.every((item) => current.includes(item.id)) ? [] : items.map((item) => item.id))}
        onCreate={() => setDrawer({ open: true, mode: "create", item: null })}
        onEdit={(item) => setDrawer({ open: true, mode: "edit", item })}
        onDelete={(item) => confirmDelete({
          title: "Confirm Deletion",
          onConfirm: async () => {
            await permissionService.delete(item.id);
            toast.success("Permission deleted.");
            await load();
          },
        })}
        onBulkDelete={() => confirmDelete({
          title: "Confirm Deletion",
          onConfirm: async () => {
            await permissionService.bulkDelete(selected);
            setSelected([]);
            toast.success("Selected permissions deleted.");
            await load();
          },
        })}
        onExport={() => exportRows("permissions.csv", items.filter((item) => selected.includes(item.id)).map((permission) => ({ name: permission.name, created_at: permission.created_at ?? "" })))}
      />
      {deleteConfirmationDialog}
      <Drawer open={drawer.open} title={drawer.mode === "create" ? "Create Permission" : "Edit Permission"} description="Keep permission names consistent with backend policy checks." onClose={() => setDrawer({ open: false, mode: "create", item: null })}>
        <PermissionForm mode={drawer.mode} permission={drawer.item} onCancel={() => setDrawer({ open: false, mode: "create", item: null })} onSubmit={submit} />
      </Drawer>
    </>
  );
}
