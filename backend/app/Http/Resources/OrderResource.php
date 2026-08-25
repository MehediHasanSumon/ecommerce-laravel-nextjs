<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $billingAddress = (array) ($this->billing_address ?? []);
        $customer = $this->customer ?: $this->user;

        return [
            'id' => (string) $this->id,
            'orderNumber' => $this->order_number,
            'customerId' => $this->customer_id,
            'status' => $this->status,
            'paymentStatus' => $this->payment_status,
            'shippingStatus' => $this->shipping_status ?? 'pending',
            'paymentMethod' => $this->payment_method,
            'shippingMethod' => $this->shipping_method_name,
            'currency' => $this->currency,
            'customer' => [
                'id' => $customer?->id,
                'name' => $customer?->name ?? ($billingAddress['full_name'] ?? 'Customer'),
                'email' => $customer?->email ?? ($billingAddress['email'] ?? null),
                'mobile' => $customer?->mobile ?? ($customer?->phone ?? ($billingAddress['phone'] ?? null)),
                'phone' => $customer?->mobile ?? ($customer?->phone ?? ($billingAddress['phone'] ?? null)),
                'address' => $customer?->address ?? ($billingAddress['address_line'] ?? null),
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
            'fraud' => $this->when((bool) $request->user()?->can('can_view_fraud_check'), fn (): array => [
                'status' => $this->fraud_status ?? 'unchecked',
                'riskScore' => $this->fraud_score !== null ? (int) $this->fraud_score : null,
                'checkedAt' => optional($this->fraud_checked_at)->toISOString(),
                'flagged' => (bool) $this->fraud_flagged,
                'onHold' => (bool) $this->fraud_hold,
                'codBlocked' => (bool) $this->fraud_cod_blocked,
                'approvedAt' => optional($this->fraud_approved_at)->toISOString(),
                'providers' => $this->relationLoaded('latestFraudCheck') && $this->latestFraudCheck
                    ? $this->latestFraudCheck->providerResults->pluck('provider')->values()->all()
                    : [],
                'checkId' => $this->latestFraudCheck?->public_id,
            ]),
            'redirectUrl' => $this->redirect_url ?? null,
            'placedAt' => optional($this->placed_at)->toISOString(),
        ];
    }
}
