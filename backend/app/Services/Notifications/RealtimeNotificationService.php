<?php

namespace App\Services\Notifications;

use App\Events\CustomerNotificationCreated;
use App\Jobs\SendAdminNotification;
use App\Models\CustomerNotification;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class RealtimeNotificationService
{
    public function queueForUser(?int $userId, array $payload): void
    {
        if (! $userId) {
            return;
        }

        $user = User::query()->find($userId);
        if (! $user) {
            return;
        }

        $this->createForUser($user, $payload);
    }

    public function queueForAdmins(array $payload): void
    {
        SendAdminNotification::dispatch($payload)->afterCommit();
    }

    public function createForUser(User $user, array $payload): CustomerNotification
    {
        $related = $payload['related'] ?? null;

        $notification = CustomerNotification::query()->create([
            'user_id' => $user->id,
            'type' => (string) ($payload['type'] ?? 'system'),
            'icon' => $payload['icon'] ?? null,
            'title' => (string) ($payload['title'] ?? Str::headline((string) ($payload['type'] ?? 'notification'))),
            'message' => (string) ($payload['message'] ?? ''),
            'action_url' => $payload['action_url'] ?? $payload['actionUrl'] ?? null,
            'notifiable_type' => $related instanceof Model ? $related::class : ($payload['notifiable_type'] ?? null),
            'notifiable_id' => $related instanceof Model ? $related->getKey() : ($payload['notifiable_id'] ?? null),
            'payload' => $payload['metadata'] ?? $payload['payload'] ?? [],
        ]);

        try {
            broadcast(new CustomerNotificationCreated($notification));
        } catch (\Throwable $exception) {
            Log::warning('notification.broadcast.failed', [
                'notification_id' => $notification->id,
                'user_id' => $user->id,
                'type' => $notification->type,
                'exception' => $exception->getMessage(),
            ]);
        }

        Log::info('notification.created', [
            'notification_id' => $notification->id,
            'user_id' => $user->id,
            'type' => $notification->type,
        ]);

        return $notification;
    }
}
