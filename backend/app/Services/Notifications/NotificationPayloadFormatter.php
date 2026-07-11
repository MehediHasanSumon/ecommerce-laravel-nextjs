<?php

namespace App\Services\Notifications;

use App\Models\CustomerNotification;

class NotificationPayloadFormatter
{
    public function format(CustomerNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'icon' => $notification->icon,
            'title' => $notification->title,
            'message' => $notification->message,
            'actionUrl' => $notification->action_url,
            'metadata' => $notification->payload ?? [],
            'read' => $notification->read_at !== null,
            'readAt' => optional($notification->read_at)->toISOString(),
            'createdAt' => optional($notification->created_at)->toISOString(),
        ];
    }
}
