<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShippingZoneResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'countries' => array_values($this->countries ?? []),
            'description' => $this->description,
            'status' => $this->status ? 'active' : 'inactive',
            'methods_count' => (int) ($this->methods_count ?? 0),
            'display_order' => (int) ($this->display_order ?? 0),
            'created_at' => optional($this->created_at)->toISOString(),
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
