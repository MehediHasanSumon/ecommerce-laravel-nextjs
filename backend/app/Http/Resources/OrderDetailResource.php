<?php

namespace App\Http\Resources;

use App\Http\Resources\Admin\CourierShipmentResource;
use App\Http\Resources\Admin\FraudCheckResource;
use App\Support\Media\PublicStorageImage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $latestTransaction = $this->transactions->first();

        return [
            ...OrderResource::make($this)->resolve(),
            'customer' => [
                'id' => $this->user?->id,
                'name' => $this->user?->name ?? ($this->billing_address['full_name'] ?? 'Guest Customer'),
                'email' => $this->user?->email ?? ($this->billing_address['email'] ?? null),
                'phone' => $this->billing_address['phone'] ?? null,
            ],
            'shippingStatus' => $this->shipping_status ?? 'pending',
            'shippingMethod' => $this->shipping_method_name,
            'shippingMethodId' => $this->shipping_method_id,
            'customerId' => $this->customer_id,
            'userId' => $this->user_id,
            'couponCode' => $this->coupon_code,
            'additionalDiscount' => round(((int) ($this->summary_snapshot['additional_discount_cents'] ?? 0)) / 100, 2),
            'billingAddress' => $this->billing_address,
            'shippingAddress' => $this->shipping_address,
            'adminNotes' => $this->admin_notes,
            'customerNotes' => $this->customer_notes,
            'deliveryNotes' => $this->delivery_notes,
            'items' => $this->items->map(function ($item): array {
                $selection = (array) ($item->selection_snapshot ?? []);
                $productImage = $item->product?->images?->firstWhere('is_primary', true)?->url
                    ?: $item->product?->images?->sortBy('sort_order')->first()?->url;

                return [
                    'id' => $item->id,
                    'productId' => $item->product_id,
                    'variantId' => $item->product_variant_id,
                    'productName' => $item->product_name,
                    'productSlug' => $item->product?->slug,
                    'image' => $this->assetUrl($selection['selected_image'] ?? $productImage),
                    'sku' => $item->sku,
                    'variantName' => $selection['selected_variant'] ?? null,
                    'quantity' => (int) $item->quantity,
                    'unitPrice' => round($item->unit_price_cents / 100, 2),
                    'discountedPrice' => $item->discounted_price_cents ? round($item->discounted_price_cents / 100, 2) : null,
                    'lineSubtotal' => round($item->line_subtotal_cents / 100, 2),
                    'lineDiscount' => round($item->line_discount_cents / 100, 2),
                    'selection' => $selection,
                ];
            })->values(),
            'payment' => [
                'gateway' => $latestTransaction?->gateway ?? $this->payment_method,
                'transactionId' => $latestTransaction?->gateway_transaction_id,
                'paymentId' => $latestTransaction?->gateway_payment_id,
                'status' => $latestTransaction?->status ?? $this->payment_status,
                'paidAt' => optional($latestTransaction?->paid_at)->toISOString(),
                'failureMessage' => $latestTransaction?->failure_message,
            ],
            'timeline' => $this->histories->map(fn ($history) => [
                'id' => $history->id,
                'type' => $history->type,
                'fromStatus' => $history->from_status,
                'toStatus' => $history->to_status,
                'title' => $history->title,
                'note' => $history->note,
                'createdAt' => optional($history->created_at)->toISOString(),
            ])->values(),
            'refunds' => $this->whenLoaded('refunds', fn () => $this->refunds->map(fn ($refund) => [
                'id' => $refund->id,
                'amount' => round($refund->amount_cents / 100, 2),
                'status' => $refund->status,
                'reason' => $refund->reason,
                'note' => $refund->note,
                'processedAt' => optional($refund->processed_at)->toISOString(),
            ])->values()),
            'shippingLogs' => $this->whenLoaded('shippingLogs', fn () => $this->shippingLogs->map(fn ($log) => [
                'id' => $log->id,
                'status' => $log->status,
                'courier' => $log->courier,
                'trackingNumber' => $log->tracking_number,
                'trackingUrl' => $log->tracking_url,
                'note' => $log->note,
                'createdAt' => optional($log->created_at)->toISOString(),
            ])->values()),
            'courierShipment' => $this->whenLoaded('courierShipments', function () {
                $shipment = $this->courierShipments->first();

                return $shipment ? CourierShipmentResource::make($shipment)->resolve() : null;
            }),
            'fraudCheck' => $this->when(
                (bool) $request->user()?->can('can_view_fraud_check') && $this->relationLoaded('latestFraudCheck'),
                fn () => $this->latestFraudCheck ? FraudCheckResource::make($this->latestFraudCheck)->resolve() : null,
            ),
            'fraudApproval' => $this->when((bool) $request->user()?->can('can_view_fraud_check'), fn (): array => [
                'onHold' => (bool) $this->fraud_hold,
                'codBlocked' => (bool) $this->fraud_cod_blocked,
                'approvedAt' => optional($this->fraud_approved_at)->toISOString(),
                'approvedBy' => $this->relationLoaded('fraudApprover') && $this->fraudApprover ? [
                    'id' => $this->fraudApprover->id,
                    'name' => $this->fraudApprover->name,
                ] : null,
            ]),
            'marketingEventId' => "purchase-order-{$this->id}",
        ];
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return PublicStorageImage::url($path);
    }
}
