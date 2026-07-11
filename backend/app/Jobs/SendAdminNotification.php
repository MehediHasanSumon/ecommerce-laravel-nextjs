<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\Notifications\RealtimeNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendAdminNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 10;

    public function __construct(public array $payload)
    {
        $this->onQueue('notifications');
    }

    public function handle(RealtimeNotificationService $notifications): void
    {
        User::query()
            ->whereHas('roles', fn ($query) => $query->whereIn('name', ['admin', 'super-admin']))
            ->where('status', 'active')
            ->chunkById(100, fn ($admins) => $admins->each(fn (User $admin) => $notifications->createForUser($admin, $this->payload)));
    }

    public function failed(Throwable $exception): void
    {
        Log::error('notification.admin.failed', [
            'payload' => $this->payload,
            'exception' => $exception->getMessage(),
        ]);
    }
}
