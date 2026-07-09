<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShippingMethodAdminResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'shipping_zone_id' => $this->shipping_zone_id,
            'shipping_zone' => $this->whenLoaded('zone', fn () => $this->zone ? [
                'id' => $this->zone->id,
                'name' => $this->zone->name,
            ] : null),
            'name' => $this->name,
            'description' => $this->description,
            'delivery_time' => $this->estimated_delivery_time,
            'delivery_type' => $this->delivery_type ?: $this->type,
            'shipping_cost' => round(((int) $this->rate_cents) / 100, 2),
            'free_shipping' => $this->type === 'free_shipping' || (int) $this->rate_cents === 0,
            'minimum_order_amount' => round(((int) ($this->minimum_order_amount_cents ?? 0)) / 100, 2),
            'status' => $this->status ? 'active' : 'inactive',
            'display_order' => (int) ($this->display_order ?? 0),
            'created_at' => optional($this->created_at)->toISOString(),
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
