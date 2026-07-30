<?php

namespace App\Http\Resources\Admin;

use App\Services\Courier\CourierManager;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourierShipmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $provider = app(CourierManager::class)->provider($this->provider);
        $canViewDiagnostics = (bool) $request->user()?->can('can_view_courier_shipment');
        $customer = $this->order?->user ?: $this->order?->guestCustomer;
        $billing = (array) ($this->order?->billing_address ?? []);

        return [
            'id' => $this->public_id,
            'orderId' => $this->order?->id,
            'orderNumber' => $this->order?->order_number ?? $this->merchant_order_id,
            'customer' => [
                'name' => $customer?->name ?? ($billing['full_name'] ?? 'Customer'),
                'email' => $customer?->email ?? ($billing['email'] ?? null),
                'phone' => $customer?->phone ?? ($billing['phone'] ?? null),
            ],
            'provider' => $this->provider,
            'providerLabel' => $provider->label(),
            'capabilities' => $provider->capabilities(),
            'externalId' => $this->external_id,
            'trackingNumber' => $this->tracking_number,
            'status' => $this->status,
            'deliveryStatus' => $this->delivery_status,
            'codStatus' => $this->cod_status,
            'rawStatus' => $this->raw_status,
            'parcelType' => $this->parcel_type,
            'deliveryType' => $this->delivery_type,
            'paymentType' => $this->payment_type,
            'itemDescription' => $this->item_description,
            'weight' => (float) $this->weight,
            'amountToCollect' => round($this->amount_to_collect_cents / 100, 2),
            'deliveryCharge' => $this->delivery_charge_cents !== null ? round($this->delivery_charge_cents / 100, 2) : null,
            'currency' => $this->order?->currency ?? 'BDT',
            'trackingUrl' => $this->tracking_url,
            'labelUrl' => $this->label_url,
            'estimatedDeliveryAt' => optional($this->estimated_delivery_at)->toISOString(),
            'shipmentCreatedAt' => optional($this->shipment_created_at)->toISOString(),
            'lastSyncedAt' => optional($this->last_synced_at)->toISOString(),
            'deliveredAt' => optional($this->delivered_at)->toISOString(),
            'cancelledAt' => optional($this->cancelled_at)->toISOString(),
            'lastError' => $canViewDiagnostics ? $this->last_error : null,
            'createdAt' => optional($this->created_at)->toISOString(),
            'events' => $this->whenLoaded('events', fn () => $this->events->map(fn ($event): array => [
                'id' => $event->id,
                'status' => $event->status,
                'rawStatus' => $event->raw_status,
                'title' => $event->title,
                'description' => $canViewDiagnostics ? $event->description : null,
                'occurredAt' => optional($event->occurred_at)->toISOString(),
            ])->values()),
            'apiLogs' => $this->when(
                $canViewDiagnostics && $this->relationLoaded('apiLogs'),
                fn () => $this->apiLogs->map(fn ($log): array => [
                    'id' => $log->request_id,
                    'operation' => $log->operation,
                    'method' => $log->method,
                    'endpoint' => $log->endpoint,
                    'requestPayload' => $log->request_payload,
                    'responsePayload' => $log->response_payload,
                    'httpStatus' => $log->http_status,
                    'status' => $log->status,
                    'executionTimeMs' => $log->execution_time_ms,
                    'retryCount' => $log->retry_count,
                    'errorMessage' => $log->error_message,
                    'createdAt' => optional($log->created_at)->toISOString(),
                ])->values(),
            ),
        ];
    }
}
