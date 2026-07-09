<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShippingMethodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'zoneId' => $this->shipping_zone_id ? (string) $this->shipping_zone_id : null,
            'zoneName' => $this->whenLoaded('zone', fn () => $this->zone?->name),
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'deliveryType' => $this->delivery_type ?: $this->type,
            'estimatedDeliveryTime' => $this->estimated_delivery_time,
            'charge' => round(((int) $this->rate_cents) / 100, 2),
            'minimumOrderAmount' => round(((int) ($this->minimum_order_amount_cents ?? 0)) / 100, 2),
            'sortOrder' => (int) ($this->display_order ?? 0),
        ];
    }
}
