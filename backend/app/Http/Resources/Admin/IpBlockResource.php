<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IpBlockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $effectiveStatus = $this->status === 'active' && $this->expires_at?->isPast() ? 'inactive' : $this->status;

        return [
            'id' => $this->id,
            'ip_address' => $this->ip_address,
            'ip_version' => $this->ip_version,
            'type' => $this->type,
            'status' => $effectiveStatus,
            'reason' => $this->reason,
            'notes' => $this->notes,
            'blocked_at' => optional($this->blocked_at)->toISOString(),
            'expires_at' => optional($this->expires_at)->toISOString(),
            'last_activity_at' => optional($this->last_activity_at)->toISOString(),
            'block_count' => $this->block_count,
            'country_code' => $this->country_code,
            'country' => $this->country,
            'city' => $this->city,
            'isp' => $this->isp,
            'user_agent' => $this->user_agent,
            'device_type' => $this->device_type,
            'browser' => $this->browser,
            'operating_system' => $this->operating_system,
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
            ] : null),
            'updated_by' => $this->whenLoaded('updater', fn () => $this->updater ? [
                'id' => $this->updater->id,
                'name' => $this->updater->name,
                'email' => $this->updater->email,
            ] : null),
            'events' => IpBlockEventResource::collection($this->whenLoaded('events')),
            'created_at' => optional($this->created_at)->toISOString(),
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
