<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MarketingTrackingEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'event_id' => $this->event_id,
            'platform' => $this->platform,
            'event_name' => $this->event_name,
            'source' => $this->source,
            'status' => $this->status,
            'consent_status' => $this->consent_status,
            'execution_time_ms' => (int) $this->execution_time_ms,
            'retry_count' => (int) $this->retry_count,
            'error_message' => $this->error_message,
            'payload' => $this->payload ?: (object) [],
            'response' => $this->response ?: (object) [],
            'user' => $this->whenLoaded('user', fn () => $this->user?->only(['id', 'name', 'email'])),
            'order' => $this->whenLoaded('order', fn () => $this->order?->only(['id', 'order_number'])),
            'actor' => $this->whenLoaded('actor', fn () => $this->actor?->only(['id', 'name'])),
            'occurred_at' => optional($this->occurred_at)->toISOString(),
            'sent_at' => optional($this->sent_at)->toISOString(),
        ];
    }
}
