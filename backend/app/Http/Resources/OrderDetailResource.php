<?php

namespace App\Http\Resources;

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
            'billingAddress' => $this->billing_address,
            'shippingAddress' => $this->shipping_address,
            'adminNotes' => $this->admin_notes,
            'customerNotes' => $this->customer_notes,
            'items' => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'productId' => $item->product_id,
                'variantId' => $item->product_variant_id,
                'productName' => $item->product_name,
                'sku' => $item->sku,
                'quantity' => (int) $item->quantity,
                'unitPrice' => round($item->unit_price_cents / 100, 2),
                'discountedPrice' => $item->discounted_price_cents ? round($item->discounted_price_cents / 100, 2) : null,
                'lineSubtotal' => round($item->line_subtotal_cents / 100, 2),
                'lineDiscount' => round($item->line_discount_cents / 100, 2),
                'selection' => $item->selection_snapshot,
            ])->values(),
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
        ];
    }
}
