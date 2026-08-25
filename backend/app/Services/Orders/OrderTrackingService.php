<?php

namespace App\Services\Orders;

use App\Models\Order;
use App\Support\Media\PublicStorageImage;

class OrderTrackingService
{
    private const PROGRESS_STATUSES = [
        'pending' => 'Order Placed',
        'confirmed' => 'Confirmed',
        'processing' => 'Processing',
        'packed' => 'Packed',
        'ready_for_shipment' => 'Ready for Shipment',
        'shipped' => 'Shipped',
        'out_for_delivery' => 'Out for Delivery',
        'delivered' => 'Delivered',
    ];

    public function find(string $orderNumber, string $mobileNumber): ?array
    {
        $order = Order::query()
            ->where('order_number', $orderNumber)
            ->with([
                'user:id,name,phone',
                'customer:id,name,mobile',
                'shippingMethod:id,estimated_days_min,estimated_days_max',
                'items.product:id,name,slug',
                'items.product.images:id,product_id,url,is_primary,sort_order',
                'shippingLogs' => fn ($query) => $query->latest(),
                'courierShipments' => fn ($query) => $query
                    ->with(['events' => fn ($events) => $events->oldest('occurred_at')])
                    ->latest(),
            ])
            ->first();

        if (! $order || ! $this->phoneMatches($order, $mobileNumber)) {
            return null;
        }

        return $this->payload($order);
    }

    private function phoneMatches(Order $order, string $provided): bool
    {
        $needle = $this->normalizePhone($provided);
        if ($needle === '') {
            return false;
        }

        $phones = [
            $order->shipping_address['phone'] ?? null,
            $order->billing_address['phone'] ?? null,
            $order->customer?->mobile,
            $order->user?->phone,
        ];

        return collect($phones)
            ->filter()
            ->contains(fn ($phone) => hash_equals($this->normalizePhone((string) $phone), $needle));
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?: '';
        if (str_starts_with($digits, '880') && strlen($digits) === 13) {
            return '0'.substr($digits, 3);
        }
        if (str_starts_with($digits, '88') && strlen($digits) === 13) {
            return substr($digits, 2);
        }
        if (strlen($digits) === 10 && str_starts_with($digits, '1')) {
            return '0'.$digits;
        }

        return $digits;
    }

    private function payload(Order $order): array
    {
        $shipping = (array) $order->shipping_address;
        $billing = (array) $order->billing_address;
        $latestShipping = $order->shippingLogs->first();
        $shipment = $order->courierShipments->first();
        $estimatedDelivery = $shipment?->estimated_delivery_at?->toISOString()
            ?: ($order->shippingMethod?->estimated_days_max && $order->placed_at
                ? $order->placed_at->copy()->addDays((int) $order->shippingMethod->estimated_days_max)->toDateString()
                : null);

        return [
            'orderId' => $order->order_number,
            'orderDate' => optional($order->placed_at)->toISOString(),
            'status' => $order->status,
            'paymentStatus' => $order->payment_status,
            'shippingStatus' => $order->shipping_status ?? 'pending',
            'paymentMethod' => $order->payment_method,
            'customer' => [
                'name' => $order->customer?->name ?? $order->user?->name ?? ($billing['full_name'] ?? 'Customer'),
                'phone' => $order->customer?->mobile ?? ($billing['phone'] ?? $shipping['phone'] ?? null),
            ],
            'shipping' => [
                'recipientName' => $shipping['full_name'] ?? null,
                'phone' => $shipping['phone'] ?? null,
                'address' => $this->address($shipping),
                'method' => $order->shipping_method_name,
                'estimatedDelivery' => $estimatedDelivery,
                'courier' => $latestShipping?->courier,
                'trackingNumber' => $shipment?->tracking_number ?? $latestShipping?->tracking_number,
                'trackingUrl' => $shipment?->tracking_url ?? $latestShipping?->tracking_url,
                'courierStatus' => $shipment?->status,
                'codStatus' => $shipment?->cod_status,
                'latestUpdate' => optional($shipment?->last_synced_at)->toISOString(),
                'courierTimeline' => $shipment?->events?->map(fn ($event): array => [
                    'status' => $event->status,
                    'title' => $event->title,
                    'description' => null,
                    'occurredAt' => optional($event->occurred_at)->toISOString(),
                ])->values()->all() ?? [],
                'deliveryNotes' => $order->delivery_notes,
            ],
            'items' => $order->items->map(function ($item): array {
                $selection = (array) ($item->selection_snapshot ?? []);
                $image = $item->product?->images?->firstWhere('is_primary', true)?->url
                    ?: $item->product?->images?->sortBy('sort_order')->first()?->url;

                return [
                    'name' => $item->product_name,
                    'slug' => $item->product?->slug,
                    'image' => $this->assetUrl($selection['selected_image'] ?? $image),
                    'variant' => $selection['selected_variant'] ?? null,
                    'sku' => $item->sku,
                    'quantity' => (int) $item->quantity,
                    'unitPrice' => round($item->unit_price_cents / 100, 2),
                    'lineTotal' => round(($item->line_subtotal_cents - $item->line_discount_cents) / 100, 2),
                ];
            })->values()->all(),
            'summary' => [
                'subtotal' => round($order->subtotal_cents / 100, 2),
                'discount' => round($order->item_discount_cents / 100, 2),
                'couponDiscount' => round($order->coupon_discount_cents / 100, 2),
                'tax' => round($order->tax_cents / 100, 2),
                'shipping' => round($order->shipping_cents / 100, 2),
                'total' => round($order->total_cents / 100, 2),
            ],
            'timeline' => $this->timeline($order),
        ];
    }

    private function timeline(Order $order): array
    {
        if (in_array($order->status, ['cancelled', 'refunded'], true)) {
            return [
                ['key' => 'pending', 'label' => 'Order Placed', 'state' => 'completed'],
                ['key' => $order->status, 'label' => ucfirst($order->status), 'state' => 'exception'],
            ];
        }

        $keys = array_keys(self::PROGRESS_STATUSES);
        $current = array_search($order->status, $keys, true);
        $current = $current === false ? 0 : $current;

        return collect(self::PROGRESS_STATUSES)->map(
            fn (string $label, string $key): array => [
                'key' => $key,
                'label' => $label,
                'state' => array_search($key, $keys, true) < $current
                    ? 'completed'
                    : (array_search($key, $keys, true) === $current ? 'current' : 'pending'),
            ]
        )->values()->all();
    }

    private function address(array $address): string
    {
        return collect([
            $address['address_line'] ?? null,
            $address['area'] ?? null,
            $address['city'] ?? null,
            $address['district'] ?? null,
            $address['state'] ?? null,
            $address['postal_code'] ?? null,
            $address['country'] ?? null,
        ])->filter()->implode(', ');
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }
        return PublicStorageImage::url($path);
    }
}
