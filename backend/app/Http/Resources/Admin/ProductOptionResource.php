<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductOptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name ?? $this->value ?? $this->title ?? (string) $this->id,
            'type' => $this->type ?? null,
            'parent_id' => $this->parent_id ?? null,
            'attribute_id' => $this->attribute_id ?? null,
            'brand_id' => $this->brand_id ?? null,
            'brand_name' => $this->brand?->name ?? null,
            'category_id' => $this->category_id ?? null,
            'category_name' => $this->category?->name ?? null,
            'slug' => $this->slug ?? null,
        ];
    }
}
