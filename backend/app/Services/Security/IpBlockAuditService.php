<?php

namespace App\Services\Security;

use App\Models\IpBlock;
use App\Models\IpBlockEvent;
use App\Models\User;
use Illuminate\Http\Request;

class IpBlockAuditService
{
    public function record(
        string $eventType,
        ?IpBlock $block = null,
        ?User $actor = null,
        ?string $reason = null,
        array $metadata = [],
        ?string $ipAddress = null,
        ?string $blockType = null,
        ?Request $request = null,
    ): IpBlockEvent {
        return IpBlockEvent::query()->create([
            'ip_block_id' => $block?->id,
            'ip_address' => $ipAddress ?? $block?->ip_address,
            'event_type' => $eventType,
            'block_type' => $blockType ?? $block?->type,
            'reason' => $reason ?? $block?->reason,
            'actor_user_id' => $actor?->id,
            'actor_name' => $actor?->name,
            'actor_email' => $actor?->email,
            'request_id' => $request?->headers->get('X-Request-ID'),
            'metadata' => $metadata === [] ? null : $metadata,
            'occurred_at' => now(),
        ]);
    }
}
