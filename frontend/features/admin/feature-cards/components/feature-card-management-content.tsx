"use client";

import * as Icons from "lucide-react";
import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Edit3,
  Filter,
  GripVertical,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { settingsApi } from "@/features/admin/settings/services/settings-service";
import { featureCardService } from "@/features/admin/feature-cards/services/feature-card-service";
import type { HomeFeatureCard, HomeFeatureCardPayload } from "@/features/admin/feature-cards/types";
import type { PaginationMeta, QueryState } from "@/features/admin/shared/types";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";

type Mode = "create" | "edit";

const pageSizes = [10, 20, 50];
const iconOptions = [
  "Truck",
  "Shield",
  "RotateCcw",
  "HeadphonesIcon",
  "BadgeCheck",
  "CreditCard",
  "PackageCheck",
  "Gift",
  "Sparkles",
  "Clock3",
  "HeartHandshake",
  "LockKeyhole",
];

const emptyForm: HomeFeatureCardPayload = {
  icon: "Truck",
  title: "",
  description: "",
  sort_order: 0,
  status: true,
};

export function HomeFeatureCardsSettingsContent() {
  const [enabled, setEnabled] = useState(true);
  const [initialEnabled, setInitialEnabled] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  useAuthStore((state) => state.user?.permissions);
  const canEditSettings = hasPermission("can_edit_home_feature_card_setting");

  useEffect(() => {
    let active = true;
    settingsApi.get<{ settings: { enabled: boolean } }>("home-feature-cards")
      .then((response) => {
        if (!active) return;
        const next = Boolean(response.data.settings.enabled);
        setEnabled(next);
        setInitialEnabled(next);
      })
      .catch((error) => toast.error(toAppError(error).message))
      .finally(() => active && setLoadingSettings(false));

    return () => { active = false; };
  }, []);

  async function saveSettings() {
    if (!canEditSettings) return;
    try {
      setSavingSettings(true);
      const response = await settingsApi.update<{ enabled: boolean }, { settings: { enabled: boolean } }>("home-feature-cards", { enabled });
      const next = Boolean(response.data.settings.enabled);
      setEnabled(next);
      setInitialEnabled(next);
      toast.success(response.message || "Feature card settings saved.");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <BadgeCheck className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Settings</span>
            </div>
            <h2 className="mt-1 text-2xl font-extrabold">Feature Cards</h2>
            <p className="text-sm text-muted-foreground">Enable the home highlight section and manage every card below.</p>
          </div>
          {canEditSettings ? <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              icon={<RotateCcw className="h-4 w-4" />}
              disabled={enabled === initialEnabled || loadingSettings}
              onClick={() => setEnabled(initialEnabled)}
            >
              Reset
            </Button>
            <Button
              type="button"
              icon={<Save className="h-4 w-4" />}
              isLoading={savingSettings}
              disabled={enabled === initialEnabled || loadingSettings}
              onClick={() => void saveSettings()}
            >
              Save Settings
            </Button>
          </div> : null}
        </div>
        <div className="p-5">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={loadingSettings || !canEditSettings}
            onClick={() => setEnabled((value) => !value)}
            className="flex w-full max-w-xl items-center justify-between gap-4 rounded-lg border border-border bg-background p-3 text-left transition hover:bg-muted/50 disabled:opacity-60"
          >
            <span>
              <span className="block text-sm font-bold">Enable Feature Cards Section</span>
              <span className="mt-1 block text-xs text-muted-foreground">OFF hides the entire section regardless of active cards.</span>
            </span>
            <span className={cn("relative h-6 w-11 rounded-full transition-colors", enabled ? "bg-primary" : "bg-muted-foreground/30")}>
              <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-background transition-transform", enabled ? "translate-x-6" : "translate-x-1")} />
            </span>
          </button>
        </div>
      </div>

      <FeatureCardCrudContent />
    </div>
  );
}

function FeatureCardCrudContent() {
  const [items, setItems] = useState<HomeFeatureCard[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [query, setQuery] = useState<Pick<QueryState, "page" | "per_page" | "search" | "sort" | "direction" | "status">>({
    page: 1,
    per_page: 10,
    search: "",
    sort: "sort_order",
    direction: "asc",
    status: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<HomeFeatureCardPayload>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof HomeFeatureCardPayload, string>>>({});
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState(query.search);
  const [filterOpen, setFilterOpen] = useState(false);
  useAuthStore((state) => state.user?.permissions);
  const canCreate = hasPermission("can_create_home_feature_card_setting");
  const canEdit = hasPermission("can_edit_home_feature_card_setting");
  const canDelete = hasPermission("can_delete_home_feature_card_setting");

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await featureCardService.list(query);
      setItems(response.data.items);
      setPagination(response.meta.pagination ?? null);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRange = useMemo(() => {
    if (!pagination) return "";
    return `${pagination.from ?? 0}-${pagination.to ?? 0} of ${pagination.total}`;
  }, [pagination]);
  const page = pagination?.current_page ?? 1;
  const lastPage = pagination?.last_page ?? 1;

  function openCreate() {
    if (!canCreate) return;
    const nextSort = items.length ? Math.max(...items.map((item) => item.sort_order)) + 1 : 0;
    setMode("create");
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: nextSort });
    setErrors({});
    setFormOpen(true);
  }

  function openEdit(card: HomeFeatureCard) {
    if (!canEdit) return;
    setMode("edit");
    setEditingId(card.id);
    setForm({
      icon: card.icon,
      title: card.title,
      description: card.description,
      sort_order: card.sort_order,
      status: card.status,
    });
    setErrors({});
    setFormOpen(true);
  }

  function validate() {
    const next: Partial<Record<keyof HomeFeatureCardPayload, string>> = {};
    if (!form.icon.trim()) next.icon = "Icon is required.";
    if (!form.title.trim()) next.title = "Title is required.";
    if (form.title.length > 120) next.title = "Title must be 120 characters or fewer.";
    if (!form.description.trim()) next.description = "Description is required.";
    if (form.description.length > 255) next.description = "Description must be 255 characters or fewer.";
    if (!Number.isFinite(form.sort_order) || form.sort_order < 0) next.sort_order = "Sort order must be a positive number.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if ((mode === "create" && !canCreate) || (mode === "edit" && !canEdit)) return;
    if (!validate()) return;

    try {
      setIsSaving(true);
      const payload = { ...form, title: form.title.trim(), description: form.description.trim(), icon: form.icon.trim() };
      const response =
        mode === "edit" && editingId
          ? await featureCardService.update(editingId, payload)
          : await featureCardService.create(payload);
      toast.success(response.message);
      setFormOpen(false);
      await load();
    } catch (error) {
      const appError = toAppError(error);
      toast.error(appError.message);
      const responseErrors = (error as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors ?? {};
      setErrors(Object.fromEntries(Object.entries(responseErrors).map(([key, value]) => [key, value[0]])) as Partial<Record<keyof HomeFeatureCardPayload, string>>);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(card: HomeFeatureCard) {
    if (!canEdit) return;
    try {
      const response = await featureCardService.update(card.id, {
        icon: card.icon,
        title: card.title,
        description: card.description,
        sort_order: card.sort_order,
        status: !card.status,
      });
      toast.success(response.message);
      await load();
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  async function destroy(card: HomeFeatureCard) {
    if (!canDelete) return;
    if (!window.confirm(`Delete "${card.title}"? This card will no longer appear on the storefront.`)) {
      return;
    }

    try {
      const response = await featureCardService.delete(card.id);
      toast.success(response.message);
      await load();
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  async function persistOrder(nextItems: HomeFeatureCard[]) {
    if (!canEdit) return;
    const offset = Math.max((pagination?.from ?? 1) - 1, 0);
    const reordered = nextItems.map((item, index) => ({ ...item, sort_order: offset + index }));
    setItems(reordered);
    try {
      const response = await featureCardService.reorder(reordered.map(({ id, sort_order }) => ({ id, sort_order })));
      setItems(response.data.items);
      toast.success(response.message);
    } catch (error) {
      toast.error(toAppError(error).message);
      await load();
    }
  }

  function move(cardId: number, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === cardId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    void persistOrder(next);
  }

  function onDrop(targetId: number) {
    if (!draggedId || draggedId === targetId) return;
    const from = items.findIndex((item) => item.id === draggedId);
    const to = items.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [dragged] = next.splice(from, 1);
    next.splice(to, 0, dragged);
    setDraggedId(null);
    void persistOrder(next);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold">Card Management</h3>
            <p className="text-sm text-muted-foreground">Create, edit, disable, delete, and reorder homepage feature cards.</p>
          </div>
          {canCreate ? <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>Create Card</Button> : null}
        </div>
        <div className="border-b border-border p-3">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && setQuery((current) => ({ ...current, page: 1, search: searchInput }))}
                placeholder="Search feature cards..."
                className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              icon={<Search className="h-4 w-4" />}
              onClick={() => setQuery((current) => ({ ...current, page: 1, search: searchInput }))}
            >
              Search
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<Filter className="h-4 w-4" />}
              onClick={() => setFilterOpen(true)}
            >
              Advanced Filter
            </Button>
          </div>
        </div>

        {query.status ? (
          <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Filter: {query.status === "true" ? "Active" : "Inactive"}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setQuery((current) => ({ ...current, page: 1, status: "" }))}
            >
              Clear Filter
            </Button>
          </div>
        ) : null}

        <FeatureCardFilterModal
          open={filterOpen}
          status={query.status}
          onClose={() => setFilterOpen(false)}
          onApply={(status) => {
            setQuery((current) => ({ ...current, page: 1, status }));
            setFilterOpen(false);
          }}
        />

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading feature cards...
          </div>
        ) : items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="w-14 px-4 py-3">Order</th>
                  <th className="px-4 py-3">Card</th>
                  <th className="px-4 py-3">Icon</th>
                  <th className="px-4 py-3">
                    <button type="button" className="inline-flex items-center gap-1 font-bold" onClick={() => setQuery((current) => ({ ...current, sort: "sort_order", direction: current.direction === "asc" ? "desc" : "asc" }))}>
                      Sort <ChevronsUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((card, index) => (
                  <FeatureCardTableRow
                    key={card.id}
                    card={card}
                    isFirst={index === 0}
                    isLast={index === items.length - 1}
                    dragging={draggedId === card.id}
                    onEdit={() => openEdit(card)}
                    onDelete={() => void destroy(card)}
                    onToggle={() => void toggleStatus(card)}
                    onMoveUp={() => move(card.id, -1)}
                    onMoveDown={() => move(card.id, 1)}
                    onDragStart={() => setDraggedId(card.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onDrop={() => onDrop(card.id)}
                    canEdit={canEdit}
                    canDelete={canDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
            <BadgeCheck className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-bold">No feature cards found</p>
              <p className="text-sm text-muted-foreground">Create one to display it on the storefront.</p>
            </div>
            {canCreate ? <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>Create Card</Button> : null}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Total Records: <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span>
            {visibleRange ? <span className="ml-2">({visibleRange})</span> : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(pagination?.per_page ?? query.per_page)} onValueChange={(value) => setQuery((current) => ({ ...current, page: 1, per_page: Number(value) }))}>
              <SelectTrigger className="h-9 w-[110px] rounded-lg px-2 text-sm" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((size) => <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft className="h-4 w-4" />}
              disabled={page <= 1}
              onClick={() => setQuery((current) => ({ ...current, page: page - 1 }))}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(lastPage, 5) }, (_, index) => {
              const start = Math.max(1, Math.min(page - 2, lastPage - 4));
              const pageNumber = start + index;
              if (pageNumber > lastPage) return null;
              return (
                <Button
                  key={pageNumber}
                  variant={pageNumber === page ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setQuery((current) => ({ ...current, page: pageNumber }))}
                >
                  {pageNumber}
                </Button>
              );
            })}
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronRight className="h-4 w-4" />}
              disabled={page >= lastPage}
              onClick={() => setQuery((current) => ({ ...current, page: page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[70]">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close drawer backdrop" onClick={() => setFormOpen(false)} />
          <form
            onSubmit={submit}
            className="absolute bottom-0 right-0 top-0 flex w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl sm:w-[34rem]"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h3 className="text-lg font-extrabold">{mode === "create" ? "Create Feature Card" : "Edit Feature Card"}</h3>
                <p className="text-sm text-muted-foreground">Storefront content is rendered from these saved values.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Close" icon={<X className="h-4 w-4" />} onClick={() => setFormOpen(false)} />
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <IconPicker value={form.icon} error={errors.icon} onChange={(icon) => setForm((current) => ({ ...current, icon }))} />
              <Input
                label="Sort Order"
                type="number"
                min={0}
                value={form.sort_order}
                error={errors.sort_order}
                onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value || 0) }))}
              />
              <Input
                label="Card Title"
                value={form.title}
                maxLength={120}
                error={errors.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Free Shipping"
              />
              <label className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3">
                <span>
                  <span className="block text-sm font-semibold">Status</span>
                  <span className="text-xs text-muted-foreground">{form.status ? "Active cards render on the homepage." : "Inactive cards stay hidden."}</span>
                </span>
                <input
                  type="checkbox"
                  checked={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.checked }))}
                  className="h-5 w-5 accent-primary"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Card Description</span>
                <textarea
                  value={form.description}
                  maxLength={255}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className={cn("min-h-28 w-full rounded-xl border border-transparent bg-muted px-4 py-3 text-sm focus:border-primary focus:bg-background", errors.description && "border-destructive")}
                  placeholder="On qualifying orders"
                />
                {errors.description ? <p className="text-sm text-destructive">{errors.description}</p> : null}
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-5">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={isSaving}>{mode === "create" ? "Create Card" : "Save Changes"}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function FeatureCardTableRow({
  card,
  isFirst,
  isLast,
  dragging,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  card: HomeFeatureCard;
  isFirst: boolean;
  isLast: boolean;
  dragging: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  return (
    <tr
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={cn("transition hover:bg-muted/40", dragging && "bg-muted opacity-60")}
    >
      <td className="px-4 py-3 align-middle">
        <button type="button" className="cursor-grab rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label={`Drag ${card.title}`}>
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {renderLucideIcon(card.icon, "h-5 w-5")}
        </div>
        <div className="min-w-0">
          <p className="font-bold">{card.title}</p>
          <p className="mt-1 max-w-md truncate text-sm text-muted-foreground">{card.description}</p>
        </div>
        </div>
      </td>
      <td className="px-4 py-3 align-middle font-medium text-muted-foreground">{card.icon}</td>
      <td className="px-4 py-3 align-middle">{card.sort_order}</td>
      <td className="px-4 py-3 align-middle">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", card.status ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground")}>
          {card.status ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canEdit ? <Button variant="ghost" size="icon" disabled={isFirst} aria-label="Move up" icon={<ArrowUp className="h-4 w-4" />} onClick={onMoveUp} /> : null}
          {canEdit ? <Button variant="ghost" size="icon" disabled={isLast} aria-label="Move down" icon={<ArrowDown className="h-4 w-4" />} onClick={onMoveDown} /> : null}
          {canEdit ? <Button variant="secondary" size="sm" onClick={onToggle}>{card.status ? "Disable" : "Enable"}</Button> : null}
          {canEdit ? <Button variant="ghost" size="icon" aria-label="Edit" icon={<Edit3 className="h-4 w-4" />} onClick={onEdit} /> : null}
          {canDelete ? <Button variant="ghost" size="icon" aria-label="Delete" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete} /> : null}
        </div>
      </td>
    </tr>
  );
}

function FeatureCardFilterModal({
  open,
  status,
  onClose,
  onApply,
}: {
  open: boolean;
  status: string;
  onClose: () => void;
  onApply: (status: string) => void;
}) {
  const [draftStatus, setDraftStatus] = useState(status || "all");

  useEffect(() => {
    setDraftStatus(status || "all");
  }, [open, status]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close filters" type="button" />
      <div className="relative w-full max-w-lg rounded-lg border border-border bg-background p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Advanced Filter</h2>
            <p className="mt-1 text-sm text-muted-foreground">Refine feature cards by visibility status.</p>
          </div>
          <Button variant="ghost" size="icon" icon={<X className="h-4 w-4" />} aria-label="Close filters" onClick={onClose} />
        </div>

        <div className="mt-5 space-y-2">
          <span className="text-sm font-semibold">Status</span>
          <Select value={draftStatus} onValueChange={setDraftStatus}>
            <SelectTrigger className="h-11 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setDraftStatus("all")}>Reset</Button>
          <Button type="button" size="sm" onClick={() => onApply(draftStatus === "all" ? "" : draftStatus)}>Apply Filters</Button>
        </div>
      </div>
    </div>
  );
}

function IconPicker({ value, error, onChange }: { value: string; error?: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold">Icon</span>
      <div className="grid grid-cols-4 gap-2">
        {iconOptions.map((icon) => {
          const selected = value === icon;
          return (
            <button
              key={icon}
              type="button"
              title={icon}
              aria-label={icon}
              onClick={() => onChange(icon)}
              className={cn(
                "flex h-12 items-center justify-center rounded-xl border transition",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted hover:bg-background"
              )}
            >
              {renderLucideIcon(icon, "h-5 w-5")}
            </button>
          );
        })}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn("h-11 w-full rounded-xl border border-transparent bg-muted pl-9 pr-3 text-sm focus:border-primary focus:bg-background", error && "border-destructive")}
          placeholder="Lucide icon name"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function renderLucideIcon(name: string, className: string) {
  const fallback = Icons.BadgeCheck;
  const Icon = (Icons as unknown as Record<string, ComponentType<{ className?: string }>>)[name] ?? fallback;

  return createElement(Icon, { className });
}
