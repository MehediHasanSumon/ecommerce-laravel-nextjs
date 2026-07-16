<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CartItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $selection = (array) ($this->selection_snapshot ?? []);
        $pricing = (array) ($this->pricing_snapshot ?? []);
        $discounted = $this->discounted_price_cents !== null ? round($this->discounted_price_cents / 100, 2) : null;

        return [
            'id' => (string) $this->id,
            'productId' => (string) $this->product_id,
            'variantId' => $this->product_variant_id ? (string) $this->product_variant_id : null,
            'quantity' => (int) $this->quantity,
            'unitPrice' => round(((int) $this->unit_price_cents) / 100, 2),
            'discountedPrice' => $discounted,
            'subtotal' => round(((int) $this->line_subtotal_cents) / 100, 2),
            'discountTotal' => round(((int) $this->line_discount_cents) / 100, 2),
            'selectedVariant' => $selection['selected_variant'] ?? null,
            'selectedSize' => $selection['selected_size'] ?? null,
            'selectedColor' => $selection['selected_color'] ?? null,
            'selectedAttributes' => $selection['selected_attributes'] ?? [],
            'selectedOptions' => $selection['selected_options'] ?? (object) [],
            'selectedSku' => $selection['selected_sku'] ?? null,
            'selectedImage' => $this->assetUrl($selection['selected_image'] ?? null),
            'pricing' => [
                'basePrice' => isset($pricing['base_price_cents']) ? round(((int) $pricing['base_price_cents']) / 100, 2) : null,
                'compareAtPrice' => isset($pricing['compare_at_price_cents']) && $pricing['compare_at_price_cents'] !== null ? round(((int) $pricing['compare_at_price_cents']) / 100, 2) : null,
                'discountedPrice' => isset($pricing['discounted_price_cents']) && $pricing['discounted_price_cents'] !== null ? round(((int) $pricing['discounted_price_cents']) / 100, 2) : null,
                'collectionDiscount' => $pricing['collection_discount'] ?? null,
            ],
            'tax' => $this->tax_snapshot ?? ['estimated_tax_cents' => 0],
            'product' => $this->product ? ProductCardResource::make($this->product)->resolve() : null,
            'availability' => [
                'inStock' => $this->product ? ($this->variant
                    ? (! $this->variant->track_inventory || (int) ($this->variant->stock_quantity ?? 0) > 0)
                    : (! $this->product->track_inventory || (int) ($this->product->stock_quantity ?? 0) > 0)) : false,
                'stock' => $this->product ? (int) ($this->variant?->stock_quantity ?? $this->product->stock_quantity ?? 0) : 0,
                'status' => $this->product?->status,
            ],
        ];
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        if (str_starts_with($path, '/storage/') || str_starts_with($path, 'storage/')) {
            return url($path);
        }

        return Storage::disk('public')->url($path);
    }
}
