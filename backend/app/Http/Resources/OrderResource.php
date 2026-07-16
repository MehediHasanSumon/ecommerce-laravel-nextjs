<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $billingAddress = (array) ($this->billing_address ?? []);
        $customer = $this->user ?: $this->guestCustomer;

        return [
            'id' => (string) $this->id,
            'orderNumber' => $this->order_number,
            'status' => $this->status,
            'paymentStatus' => $this->payment_status,
            'shippingStatus' => $this->shipping_status ?? 'pending',
            'paymentMethod' => $this->payment_method,
            'shippingMethod' => $this->shipping_method_name,
            'currency' => $this->currency,
            'customer' => [
                'id' => $customer?->id,
                'type' => $this->user_id ? 'registered' : 'guest',
                'name' => $customer?->name ?? ($billingAddress['full_name'] ?? 'Guest Customer'),
                'email' => $customer?->email ?? ($billingAddress['email'] ?? null),
                'phone' => $customer?->phone ?? ($billingAddress['phone'] ?? null),
            ],
            'itemsCount' => $this->items_count ?? $this->items?->count(),
            'summary' => [
                'subtotal' => round($this->subtotal_cents / 100, 2),
                'itemDiscount' => round($this->item_discount_cents / 100, 2),
                'couponDiscount' => round($this->coupon_discount_cents / 100, 2),
                'shipping' => round($this->shipping_cents / 100, 2),
                'tax' => round($this->tax_cents / 100, 2),
                'total' => round($this->total_cents / 100, 2),
            ],
            'redirectUrl' => $this->redirect_url ?? null,
            'placedAt' => optional($this->placed_at)->toISOString(),
        ];
    }
}
