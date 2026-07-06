<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'orderNumber' => $this->order_number,
            'status' => $this->status,
            'paymentStatus' => $this->payment_status,
            'paymentMethod' => $this->payment_method,
            'currency' => $this->currency,
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
