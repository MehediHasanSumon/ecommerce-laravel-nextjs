<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IpBlockEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'event_type' => $this->event_type,
            'block_type' => $this->block_type,
            'reason' => $this->reason,
            'actor' => $this->actor_name ? ['name' => $this->actor_name, 'email' => $this->actor_email] : null,
            'metadata' => $this->metadata,
            'occurred_at' => optional($this->occurred_at)->toISOString(),
        ];
    }
}
