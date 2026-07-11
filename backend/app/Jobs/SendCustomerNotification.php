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

class SendCustomerNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 10;

    public function __construct(
        public int $userId,
        public array $payload,
    ) {
        $this->onQueue('notifications');
    }

    public function handle(RealtimeNotificationService $notifications): void
    {
        $user = User::query()->find($this->userId);
        if (! $user) {
            return;
        }

        $notifications->createForUser($user, $this->payload);
    }

    public function failed(Throwable $exception): void
    {
        Log::error('notification.customer.failed', [
            'user_id' => $this->userId,
            'payload' => $this->payload,
            'exception' => $exception->getMessage(),
        ]);
    }
}
