<?php

namespace App\Jobs;

use App\Models\MarketingTrackingEvent;
use App\Models\Settings\GoogleAnalyticsSetting;
use App\Models\Settings\MetaPixelSetting;
use App\Services\Marketing\MarketingProviderManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;
use Throwable;

class DeliverMarketingTrackingEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public int $timeout = 30;

    public function __construct(public int $eventId) {}

    public function handle(MarketingProviderManager $providers): void
    {
        $event = MarketingTrackingEvent::query()->find($this->eventId);
        if (! $event || in_array($event->status, ['sent', 'skipped'], true)) {
            return;
        }

        $started = hrtime(true);
        try {
            $response = $providers->provider($event->platform)->send($event);
            $event->forceFill([
                'status' => 'sent',
                'response' => $response,
                'execution_time_ms' => (int) round((hrtime(true) - $started) / 1_000_000),
                'retry_count' => max(0, $this->attempts() - 1),
                'error_message' => null,
                'sent_at' => now(),
            ])->save();
            $this->updateSetting($event->platform, true, $response);
        } catch (Throwable $exception) {
            $event->forceFill([
                'status' => 'retrying',
                'execution_time_ms' => (int) round((hrtime(true) - $started) / 1_000_000),
                'retry_count' => $this->attempts(),
                'error_message' => Str::limit($exception->getMessage(), 5000, ''),
            ])->save();
            report($exception);
            throw $exception;
        }
    }

    public function failed(Throwable $exception): void
    {
        $event = MarketingTrackingEvent::query()->find($this->eventId);
        if (! $event || $event->status === 'sent') {
            return;
        }

        $message = Str::limit($exception->getMessage(), 5000, '');
        $event->forceFill([
            'status' => 'failed',
            'retry_count' => max($event->retry_count, $this->tries),
            'error_message' => $message,
        ])->save();
        $this->updateSetting($event->platform, false, ['error' => $message]);
    }

    private function updateSetting(string $platform, bool $success, array $response): void
    {
        $setting = $platform === 'meta'
            ? MetaPixelSetting::query()->first()
            : GoogleAnalyticsSetting::query()->first();
        if (! $setting) {
            return;
        }

        $setting->forceFill([
            'connection_status' => $success ? 'connected' : 'failed',
            'last_connection_attempt_at' => now(),
            'last_successful_event_at' => $success ? now() : $setting->last_successful_event_at,
            'last_response' => $response,
            'last_error' => $success ? null : Str::limit((string) ($response['error'] ?? 'Tracking delivery failed.'), 5000, ''),
        ])->save();
    }
}
