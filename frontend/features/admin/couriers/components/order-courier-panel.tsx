"use client";

import * as React from "react";
import { Calculator, ExternalLink, PackagePlus, Printer, RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { courierService } from "@/features/admin/couriers/services/courier-service";
import type {
  CourierProviderOption,
  CourierShipment,
  CreateCourierShipmentPayload,
} from "@/features/admin/couriers/types";
import { formatDate, statusLabel } from "@/features/admin/shared/utils";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { formatPrice } from "@/utils/format";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";

type LocationOption = { id: number; label: string };

export function OrderCourierPanel({
  orderNumber,
  shipment,
  onChanged,
}: {
  orderNumber: string;
  shipment?: CourierShipment | null;
  onChanged: () => void;
}) {
  const [providers, setProviders] = React.useState<CourierProviderOption[]>([]);
  const [selectedProvider, setSelectedProvider] = React.useState("");
  const [form, setForm] = React.useState({
    weight: "0.5",
    amount_to_collect: "",
    item_description: "",
    special_instruction: "",
    store_id: "",
    city_id: "",
    zone_id: "",
    area_id: "",
  });
  const [stores, setStores] = React.useState<LocationOption[]>([]);
  const [cities, setCities] = React.useState<LocationOption[]>([]);
  const [zones, setZones] = React.useState<LocationOption[]>([]);
  const [areas, setAreas] = React.useState<LocationOption[]>([]);
  const [busy, setBusy] = React.useState<"create" | "sync" | "cancel" | null>(null);
  const [charge, setCharge] = React.useState<{
    delivery: number;
    cod: number;
    weight: number;
    zone: number;
    return: number;
  } | null>(null);
  const { confirmDelete, deleteConfirmationDialog } = useDeleteConfirmation();
  useAuthStore((state) => state.user?.permissions);
  const canCreate = hasPermission("can_create_courier_shipment");
  const canEdit = hasPermission("can_edit_courier_shipment");

  React.useEffect(() => {
    if (!canCreate || shipment) return;
    courierService.options()
      .then((response) => {
        const available = response.data.providers;
        setProviders(available);
        const first = available[0];
        if (first) {
          setSelectedProvider(first.provider);
          setForm((current) => ({
            ...current,
            weight: String(first.defaults.weight),
            item_description: first.defaults.itemDescription ?? "",
            store_id: first.defaults.storeId ?? "",
          }));
        }
      })
      .catch((error) => toast.error(toAppError(error).message));
  }, [canCreate, shipment]);

  const selected = providers.find((provider) => provider.provider === selectedProvider);

  React.useEffect(() => {
    if (selectedProvider !== "pathao" || !selected?.capabilities.locations) {
      setStores([]);
      setCities([]);
      return;
    }
    Promise.all([
      courierService.locations("pathao", "stores"),
      courierService.locations("pathao", "cities"),
    ]).then(([storeResponse, cityResponse]) => {
      setStores(normalizeLocations(storeResponse.data.items, ["store_id", "id"], ["store_name", "name"]));
      setCities(normalizeLocations(cityResponse.data.items, ["city_id", "id"], ["city_name", "name"]));
    }).catch(() => {
      setStores([]);
      setCities([]);
    });
  }, [selected?.capabilities.locations, selectedProvider]);

  async function loadZones(cityId: string) {
    setForm((current) => ({ ...current, city_id: cityId, zone_id: "", area_id: "" }));
    setAreas([]);
    if (!cityId) return setZones([]);
    try {
      const response = await courierService.locations("pathao", "zones", { city_id: Number(cityId) });
      setZones(normalizeLocations(response.data.items, ["zone_id", "id"], ["zone_name", "name"]));
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  async function loadAreas(zoneId: string) {
    setForm((current) => ({ ...current, zone_id: zoneId, area_id: "" }));
    if (!zoneId) return setAreas([]);
    try {
      const response = await courierService.locations("pathao", "areas", { zone_id: Number(zoneId) });
      setAreas(normalizeLocations(response.data.items, ["area_id", "id"], ["area_name", "name"]));
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  async function createShipment() {
    if (!selectedProvider) return;
    const payload: CreateCourierShipmentPayload = {
      provider: selectedProvider as CreateCourierShipmentPayload["provider"],
      weight: Number(form.weight),
      item_description: form.item_description || undefined,
      special_instruction: form.special_instruction || undefined,
      amount_to_collect: form.amount_to_collect === "" ? undefined : Number(form.amount_to_collect),
      store_id: form.store_id ? Number(form.store_id) : undefined,
      city_id: form.city_id ? Number(form.city_id) : undefined,
      zone_id: form.zone_id ? Number(form.zone_id) : undefined,
      area_id: form.area_id ? Number(form.area_id) : undefined,
    };
    try {
      setBusy("create");
      const response = await courierService.createForOrder(orderNumber, payload);
      toast.success(response.message || "Courier shipment created.");
      onChanged();
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setBusy(null);
    }
  }

  async function shipmentAction(action: "sync" | "cancel") {
    if (!shipment) return;
    try {
      setBusy(action);
      const response = action === "sync" ? await courierService.sync(shipment.id) : await courierService.cancel(shipment.id);
      toast.success(response.message);
      onChanged();
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setBusy(null);
    }
  }

  async function calculateCharge() {
    if (!selected || !form.city_id || !form.zone_id) return;
    try {
      setBusy("create");
      const response = await courierService.calculateCharge({
        provider: selected.provider,
        store_id: Number(form.store_id || selected.defaults.storeId || 0),
        item_type: Number(selected.defaults.parcelType || 2),
        delivery_type: Number(selected.defaults.deliveryType || 48),
        item_weight: Number(form.weight),
        recipient_city: Number(form.city_id),
        recipient_zone: Number(form.zone_id),
      });
      if (!response.data.available || !response.data.charge) {
        setCharge(null);
        toast.info(response.message || "Use the configured shipping method charge.");
        return;
      }
      setCharge({
        delivery: response.data.charge.delivery_charge_cents / 100,
        cod: response.data.charge.cod_charge_cents / 100,
        weight: response.data.charge.weight_charge_cents / 100,
        zone: response.data.charge.zone_charge_cents / 100,
        return: response.data.charge.return_charge_cents / 100,
      });
      toast.success(response.message);
    } catch (error) {
      setCharge(null);
      toast.error(toAppError(error).message);
    } finally {
      setBusy(null);
    }
  }

  function printShipment() {
    if (!shipment) return;
    const url = shipment.labelUrl
      || `${(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth").replace(/\/auth\/?$/, "")}/admin/orders/${encodeURIComponent(orderNumber)}/delivery-slip`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-bold">Courier Information</h2><p className="mt-1 text-sm text-muted-foreground">Create and manage the provider shipment attached to this order.</p></div>
        {shipment ? <StatusBadge value={shipment.status} /> : null}
      </div>

      {shipment ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {canEdit && shipment.capabilities.remote_status ? <Button size="sm" variant="secondary" icon={<RefreshCw className="h-4 w-4" />} isLoading={busy === "sync"} onClick={() => void shipmentAction("sync")}>Re-sync Status</Button> : null}
            {canEdit && shipment.capabilities.cancel && !["delivered", "returned", "cancelled"].includes(shipment.status) ? <Button size="sm" variant="danger" isLoading={busy === "cancel"} onClick={() => confirmDelete({ title: "Cancel Courier Shipment", message: "Cancel this shipment with the courier provider? This action may not be reversible.", onConfirm: () => shipmentAction("cancel") })}>Cancel Shipment</Button> : null}
            <Button size="sm" variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={printShipment}>Print Label</Button>
            {shipment.trackingUrl ? <a href={shipment.trackingUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary" icon={<ExternalLink className="h-4 w-4" />}>Track Parcel</Button></a> : null}
          </div>
          <ShipmentDetails shipment={shipment} />
          <div className="grid gap-5 lg:grid-cols-2">
            <section><h3 className="text-sm font-bold">Tracking Timeline</h3><div className="mt-3 space-y-3">{shipment.events?.length ? shipment.events.map((event) => <div key={event.id} className="border-l-2 border-primary/40 pl-3"><p className="text-sm font-semibold">{event.title}</p><p className="text-xs text-muted-foreground">{formatDate(event.occurredAt)}</p>{event.description ? <p className="mt-1 text-sm text-muted-foreground">{event.description}</p> : null}</div>) : <p className="text-sm text-muted-foreground">No courier events recorded.</p>}</div></section>
            {shipment.apiLogs ? <section><h3 className="text-sm font-bold">Courier Response Logs</h3><div className="mt-3 max-h-80 space-y-2 overflow-y-auto">{shipment.apiLogs.map((log) => <details key={log.id} className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-semibold">{log.operation} · {log.httpStatus ?? "Network"} · {log.executionTimeMs}ms</summary>{log.errorMessage ? <p className="mt-2 text-sm text-destructive">{log.errorMessage}</p> : null}<pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-2 text-xs">{JSON.stringify({ request: log.requestPayload, response: log.responsePayload }, null, 2)}</pre></details>)}</div></section> : null}
          </div>
        </div>
      ) : canCreate ? (
        providers.length ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldSelect label="Courier Provider" value={selectedProvider} options={providers.map((provider) => ({ value: provider.provider, label: provider.label }))} onChange={(provider) => {
                setSelectedProvider(provider);
                const option = providers.find((item) => item.provider === provider);
                setCharge(null);
                if (option) setForm((current) => ({ ...current, weight: String(option.defaults.weight), item_description: option.defaults.itemDescription ?? "", store_id: option.defaults.storeId ?? "", city_id: "", zone_id: "", area_id: "" }));
              }} />
              <Input label="Parcel Weight (kg)" type="number" min="0.1" max="100" step="0.1" value={form.weight} onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))} />
              <Input label="COD Amount Override" type="number" min="0" step="0.01" placeholder="Use provider rule" value={form.amount_to_collect} onChange={(event) => setForm((current) => ({ ...current, amount_to_collect: event.target.value }))} />
              {selectedProvider === "pathao" && stores.length ? <FieldSelect label="Pathao Store" value={form.store_id} options={stores.map((item) => ({ value: String(item.id), label: item.label }))} onChange={(store_id) => setForm((current) => ({ ...current, store_id }))} optional /> : null}
              {selectedProvider === "pathao" && cities.length ? <FieldSelect label="Pathao City" value={form.city_id} options={cities.map((item) => ({ value: String(item.id), label: item.label }))} onChange={(value) => void loadZones(value)} optional /> : null}
              {selectedProvider === "pathao" && zones.length ? <FieldSelect label="Pathao Zone" value={form.zone_id} options={zones.map((item) => ({ value: String(item.id), label: item.label }))} onChange={(value) => void loadAreas(value)} optional /> : null}
              {selectedProvider === "pathao" && areas.length ? <FieldSelect label="Pathao Area" value={form.area_id} options={areas.map((item) => ({ value: String(item.id), label: item.label }))} onChange={(area_id) => setForm((current) => ({ ...current, area_id }))} optional /> : null}
              <Input label="Item Description" value={form.item_description} onChange={(event) => setForm((current) => ({ ...current, item_description: event.target.value }))} />
              <Input label="Special Instruction" value={form.special_instruction} onChange={(event) => setForm((current) => ({ ...current, special_instruction: event.target.value }))} />
            </div>
            {charge ? <div className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm sm:grid-cols-5"><ChargeValue label="Delivery" value={charge.delivery} /><ChargeValue label="COD" value={charge.cod} /><ChargeValue label="Weight" value={charge.weight} /><ChargeValue label="Zone" value={charge.zone} /><ChargeValue label="Return" value={charge.return} /></div> : null}
            <div className="flex flex-wrap gap-2">
              {selected?.capabilities.charge ? <Button size="sm" variant="secondary" icon={<Calculator className="h-4 w-4" />} isLoading={busy === "create"} disabled={!form.city_id || !form.zone_id || Number(form.weight) <= 0} onClick={() => void calculateCharge()}>Calculate Charge</Button> : null}
              <Button size="sm" icon={<PackagePlus className="h-4 w-4" />} isLoading={busy === "create"} disabled={!selectedProvider || Number(form.weight) <= 0} onClick={() => void createShipment()}>Create Shipment</Button>
            </div>
          </div>
        ) : <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground"><Truck className="mx-auto mb-2 h-5 w-5" />No enabled courier provider is available.</div>
      ) : <p className="text-sm text-muted-foreground">No courier shipment has been created for this order.</p>}
    </section>
    {deleteConfirmationDialog}
    </>
  );
}

function ShipmentDetails({ shipment }: { shipment: CourierShipment }) {
  const rows = [
    ["Courier Provider", shipment.providerLabel],
    ["Tracking Number", shipment.trackingNumber],
    ["Consignment / Order ID", shipment.externalId],
    ["Shipment Status", statusLabel(shipment.status)],
    ["Delivery Status", statusLabel(shipment.deliveryStatus)],
    ["COD Status", statusLabel(shipment.codStatus)],
    ["Delivery Charge", shipment.deliveryCharge === null ? null : formatPrice(shipment.deliveryCharge)],
    ["Parcel Weight", `${shipment.weight} kg`],
    ["Shipment Created", formatDate(shipment.shipmentCreatedAt)],
    ["Last Synced", formatDate(shipment.lastSyncedAt)],
  ];
  return <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="bg-background p-3"><p className="text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value || "Not available"}</p></div>)}{shipment.lastError ? <div className="bg-background p-3 text-sm text-destructive sm:col-span-2">{shipment.lastError}</div> : null}</div>;
}

function FieldSelect({ label, value, options, onChange, optional }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; optional?: boolean }) {
  return <label className="block space-y-2 text-sm font-medium"><span>{label}</span><Select value={value || (optional ? "auto" : "")} onValueChange={(next) => onChange(next === "auto" ? "" : next)}><SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger><SelectContent>{optional ? <SelectItem value="auto">Match from shipping address</SelectItem> : null}{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></label>;
}

function StatusBadge({ value }: { value: string }) {
  return <span className="inline-flex w-fit rounded-full border border-border px-2.5 py-1 text-xs font-bold">{statusLabel(value)}</span>;
}

function ChargeValue({ label, value }: { label: string; value: number }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold">{formatPrice(value)}</p></div>;
}

function normalizeLocations(items: Array<Record<string, unknown>>, idKeys: string[], labelKeys: string[]): LocationOption[] {
  return items.map((item) => {
    const id = idKeys.map((key) => Number(item[key] ?? 0)).find((value) => value > 0) ?? 0;
    const label = labelKeys.map((key) => String(item[key] ?? "")).find(Boolean) ?? String(id);
    return { id, label };
  }).filter((item) => item.id > 0);
}
