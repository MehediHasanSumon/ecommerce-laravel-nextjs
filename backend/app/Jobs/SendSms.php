<?php

namespace App\Jobs;

use App\Models\SmsLog;
use App\Services\Sms\SmsDeliveryService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class SendSms implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [15, 60, 180];

    public function __construct(public int $smsLogId)
    {
        $this->onQueue('sms');
    }

    public function handle(SmsDeliveryService $delivery): void
    {
        $log = SmsLog::query()->find($this->smsLogId);
        if (! $log || $log->status === 'sent') {
            return;
        }

        $delivery->deliver($log);
    }

    public function failed(Throwable $exception): void
    {
        SmsLog::query()->whereKey($this->smsLogId)->update([
            'status' => 'failed',
            'error_message' => $exception->getMessage(),
            'failed_at' => now(),
        ]);
    }
}
