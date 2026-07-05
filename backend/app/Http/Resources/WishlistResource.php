<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WishlistResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $items = WishlistItemResource::collection($this->items)->resolve();

        return [
            'id' => (string) $this->id,
            'items' => $items,
            'count' => count($items),
            'updatedAt' => optional($this->updated_at)->toISOString(),
        ];
    }
}
