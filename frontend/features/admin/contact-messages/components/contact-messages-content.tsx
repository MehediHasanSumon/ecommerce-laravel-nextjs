"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Filter, Mail, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";
import { useUrlQueryState } from "@/features/admin/shared/hooks/use-url-query-state";
import { contactMessageService } from "@/features/admin/contact-messages/services/contact-message-service";
import type { ContactMessage, ContactMessageStatus } from "@/features/admin/contact-messages/types";
import type { PaginationMeta } from "@/features/admin/shared/types";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";

const statuses: Array<ContactMessageStatus | "all"> = ["all", "new", "read", "replied", "closed"];
const pageSizes = [10, 20, 50, 100];

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function statusLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ContactMessagesContent() {
  const { query, setQuery } = useUrlQueryState("created_at");
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState({ total: 0, new: 0, replied: 0, closed: 0 });
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(query.search);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const { confirmDelete, deleteConfirmationDialog } = useDeleteConfirmation();
  useAuthStore((state) => state.user?.permissions);
  const canEdit = hasPermission("can_edit_contact_message");
  const canDelete = hasPermission("can_delete_contact_message");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await contactMessageService.list({
        page: query.page,
        per_page: query.per_page,
        search: query.search,
        status: query.status,
        sort: query.sort,
        direction: query.direction,
      });
      setItems(response.data.messages);
      setStats(response.data.stats);
      setPagination(response.meta.pagination ?? null);
      setSelected((current) => current ? response.data.messages.find((item) => item.id === current.id) ?? current : null);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [query.direction, query.page, query.per_page, query.search, query.sort, query.status]);

  useEffect(() => { void load(); }, [load]);

  const page = pagination?.current_page ?? 1;
  const lastPage = pagination?.last_page ?? 1;
  const statCards = useMemo(() => [
    ["Total", stats.total],
    ["New", stats.new],
    ["Replied", stats.replied],
    ["Closed", stats.closed],
  ], [stats]);

  async function updateMessage(message: ContactMessage, status: ContactMessageStatus, note = message.admin_note ?? "") {
    try {
      const updated = await contactMessageService.update(message.id, { status, admin_note: note || null });
      setSelected(updated);
      toast.success("Contact message updated.");
      await load();
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Dashboard</span>
          <ChevronRight className="h-4 w-4" />
          <span>Content</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Contact Inbox</span>
        </div>

        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Contact Inbox</h1>
            <p className="mt-1 text-sm text-muted-foreground">Review customer messages, update status, and keep internal support notes.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-semibold">
            <Mail className="h-4 w-4" />
            {stats.new} new
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-extrabold">{value}</p>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && setQuery({ search: searchInput, page: 1 })}
                placeholder="Search messages..."
                className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <Button size="sm" variant="secondary" icon={<Search className="h-4 w-4" />} onClick={() => setQuery({ search: searchInput, page: 1 })}>Search</Button>
            <Select value={query.status || "all"} onValueChange={(value) => setQuery({ status: value === "all" ? "" : value, page: 1 })}>
              <SelectTrigger className="h-9 w-40 rounded-lg px-3 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => <SelectItem key={status} value={status}>{status === "all" ? "Any status" : statusLabel(status)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="secondary" icon={<Filter className="h-4 w-4" />} onClick={() => setQuery({ status: "", search: "", page: 1 })}>Reset</Button>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-border bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    {[
                      ["name", "Sender"],
                      ["subject", "Subject"],
                      ["status", "Status"],
                      ["created_at", "Received"],
                    ].map(([key, label]) => (
                      <th key={key} className="px-4 py-3">
                        <button type="button" className="inline-flex items-center gap-1 font-bold" onClick={() => setQuery({ sort: key, direction: query.sort === key && query.direction === "asc" ? "desc" : "asc", page: 1 })}>
                          {label} <ChevronsUpDown className="h-3.5 w-3.5" />
                        </button>
                      </th>
                    ))}
                    {canDelete ? <th className="px-4 py-3 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton rows={6} columns={4} actions={canDelete} />
                  ) : items.length ? items.map((item) => (
                    <tr key={item.id} onClick={() => setSelected(item)} className={cn("cursor-pointer border-t border-border hover:bg-muted/40", selected?.id === item.id && "bg-muted/60")}>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.email}</p>
                      </td>
                      <td className="px-4 py-3">{item.subject}</td>
                      <td className="px-4 py-3"><span className="rounded-full border border-border px-2 py-1 text-xs font-bold">{statusLabel(item.status)}</span></td>
                      <td className="px-4 py-3">{formatDate(item.created_at)}</td>
                      {canDelete ? <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          icon={<Trash2 className="h-4 w-4" />}
                          aria-label="Delete"
                          onClick={(event) => {
                            event.stopPropagation();
                            confirmDelete({
                              title: "Confirm Deletion",
                              onConfirm: async () => {
                                await contactMessageService.delete(item.id);
                                toast.success("Message deleted.");
                                setSelected((current) => current?.id === item.id ? null : current);
                                await load();
                              },
                            });
                          }}
                        />
                      </td> : null}
                    </tr>
                  )) : (
                    <tr><td colSpan={4 + (canDelete ? 1 : 0)} className="h-48 text-center text-muted-foreground">No contact messages found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <aside className="border-t border-border p-4 lg:border-l lg:border-t-0">
              {selected ? (
                <MessageDetail message={selected} canEdit={canEdit} onUpdate={updateMessage} />
              ) : (
                <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Select a message to view details.
                </div>
              )}
            </aside>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Total Records: <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span></p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(pagination?.per_page ?? 10)} onValueChange={(value) => setQuery({ per_page: Number(value), page: 1 })}>
                <SelectTrigger className="h-9 w-[110px] rounded-lg px-2 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{pageSizes.map((size) => <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="secondary" size="sm" icon={<ChevronLeft className="h-4 w-4" />} disabled={page <= 1} onClick={() => setQuery({ page: page - 1 })}>Previous</Button>
              <Button variant="secondary" size="sm" icon={<ChevronRight className="h-4 w-4" />} disabled={page >= lastPage} onClick={() => setQuery({ page: page + 1 })}>Next</Button>
            </div>
          </div>
        </section>
      </div>
      {deleteConfirmationDialog}
    </>
  );
}

function MessageDetail({ message, canEdit, onUpdate }: { message: ContactMessage; canEdit: boolean; onUpdate: (message: ContactMessage, status: ContactMessageStatus, note?: string) => Promise<void> }) {
  const [note, setNote] = useState(message.admin_note ?? "");
  const [status, setStatus] = useState<ContactMessageStatus>(message.status);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNote(message.admin_note ?? "");
    setStatus(message.status);
  }, [message]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Selected Message</p>
        <h2 className="mt-1 text-lg font-bold">{message.subject}</h2>
        <p className="text-sm text-muted-foreground">{message.name} • {message.email}</p>
      </div>
      {message.phone ? <p className="text-sm"><span className="font-semibold">Phone:</span> {message.phone}</p> : null}
      <div className="rounded-lg bg-muted p-3 text-sm leading-6">{message.message}</div>
      {canEdit ? <label className="block space-y-1.5 text-sm font-semibold">
        <span>Status</span>
        <Select value={status} onValueChange={(value) => setStatus(value as ContactMessageStatus)}>
          <SelectTrigger className="h-10 rounded-lg px-3 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {statuses.filter((item) => item !== "all").map((item) => <SelectItem key={item} value={item}>{statusLabel(item)}</SelectItem>)}
          </SelectContent>
        </Select>
      </label> : null}
      {canEdit ? <label className="block space-y-1.5 text-sm font-semibold">
        <span>Admin Note</span>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
      </label> : null}
      {canEdit ? <Button
        size="sm"
        isLoading={saving}
        onClick={async () => {
          setSaving(true);
          await onUpdate(message, status, note);
          setSaving(false);
        }}
      >
        Save Message
      </Button> : null}
    </div>
  );
}
