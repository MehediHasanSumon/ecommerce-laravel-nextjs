<?php

namespace App\Http\Resources;

use App\Services\Collections\CollectionProductResolver;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WishlistItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $product = $this->product;
        $card = $product ? ProductCardResource::make($product)->resolve() : null;
        $collection = $product ? app(CollectionProductResolver::class)->activeCollectionForProduct($product) : null;
        $discountedPrice = null;

        if ($collection && $collection->discount_enabled && $collection->discount_type && $collection->discount_value) {
            $base = (int) $product->base_price_cents;
            $discounted = match ($collection->discount_type) {
                'percentage' => (int) round($base * max(0, 100 - (int) $collection->discount_value) / 100),
                'fixed' => max(0, $base - (int) $collection->discount_value),
                default => $base,
            };
            if ($discounted < $base) {
                $discountedPrice = round($discounted / 100, 2);
            }
        }

        return [
            'id' => (string) $this->id,
            'productId' => (string) $this->product_id,
            'addedAt' => optional($this->created_at)->toISOString(),
            'product' => $card,
            'discountedPrice' => $discountedPrice,
            'stockStatus' => ! $product ? 'unavailable' : ((! $product->track_inventory || (int) ($product->stock_quantity ?? 0) > 0) ? 'in_stock' : 'out_of_stock'),
        ];
    }
}
