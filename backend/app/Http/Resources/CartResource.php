<?php

namespace App\Http\Resources;

use App\Services\Commerce\CouponService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $items = CartItemResource::collection($this->items)->resolve();
        $subtotal = collect($items)->sum('subtotal');
        $itemDiscount = collect($items)->sum('discountTotal');
        $tax = collect($items)->sum(fn ($item) => ((float) (($item['tax']['estimated_tax_cents'] ?? 0) / 100)));
        $couponDiscount = round(((int) $this->coupon_discount_cents) / 100, 2);
        $couponSnapshot = (array) ($this->coupon_snapshot ?? []);
        $shippingOriginal = round(app(CouponService::class)->estimateShippingCents() / 100, 2);
        $shippingDiscount = round(((int) ($couponSnapshot['shipping_discount_cents'] ?? 0)) / 100, 2);
        $shipping = max(0, $shippingOriginal - $shippingDiscount);
        $couponName = $couponSnapshot['name'] ?? $this->coupon?->name;

        return [
            'id' => (string) $this->id,
            'items' => $items,
            'itemCount' => collect($items)->sum('quantity'),
            'couponCode' => $this->coupon_code,
            'coupon' => $this->coupon_code ? [
                'code' => $this->coupon_code,
                'name' => $couponName,
                'discount' => $couponDiscount,
                'freeShipping' => (bool) ($couponSnapshot['free_shipping'] ?? false),
                'shippingDiscount' => $shippingDiscount,
            ] : null,
            'notice' => $this->coupon_notice ?: null,
            'summary' => [
                'subtotal' => round($subtotal, 2),
                'itemDiscount' => round($itemDiscount, 2),
                'couponDiscount' => $couponDiscount,
                'discount' => round($itemDiscount + $couponDiscount, 2),
                'estimatedTax' => round($tax, 2),
                'shippingOriginal' => $shippingOriginal,
                'shippingDiscount' => $shippingDiscount,
                'shipping' => round($shipping, 2),
                'total' => round($subtotal - $itemDiscount - $couponDiscount + $shipping + $tax, 2),
            ],
            'updatedAt' => optional($this->updated_at)->toISOString(),
        ];
    }
}
