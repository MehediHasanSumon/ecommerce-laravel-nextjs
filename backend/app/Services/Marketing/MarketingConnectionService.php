<?php

namespace App\Services\Marketing;

use App\Models\MarketingTrackingEvent;
use App\Services\Admin\Settings\MarketingSettingsService;
use Illuminate\Support\Str;
use Throwable;

class MarketingConnectionService
{
    public function __construct(
        private readonly MarketingProviderManager $providers,
        private readonly MarketingSettingsService $settings,
    ) {}

    public function test(string $platform): array
    {
        $setting = $platform === 'meta' ? $this->settings->meta() : $this->settings->google();
        $event = MarketingTrackingEvent::query()->create([
            'public_id' => (string) Str::uuid(),
            'event_id' => 'test-'.Str::uuid(),
            'platform' => $platform,
            'event_name' => 'page_view',
            'source' => 'test',
            'status' => 'queued',
            'consent_status' => 'granted',
            'payload' => [
                'client_id' => 'marketing-connection-test',
                'event_url' => rtrim((string) config('app.url'), '/').'/admin/settings',
                'page_title' => 'Marketing Analytics Connection Test',
            ],
            'occurred_at' => now(),
        ]);
        $started = hrtime(true);

        try {
            $response = $this->providers->provider($platform)->send($event, true);
            $duration = (int) round((hrtime(true) - $started) / 1_000_000);
            $event->update([
                'status' => 'sent',
                'response' => $response,
                'execution_time_ms' => $duration,
                'sent_at' => now(),
            ]);
            $setting->forceFill([
                'connection_status' => 'connected',
                'last_connection_attempt_at' => now(),
                'last_successful_event_at' => now(),
                'last_response' => $response,
                'last_error' => null,
            ])->save();

            return ['connected' => true, 'response_time_ms' => $duration, 'response' => $response];
        } catch (Throwable $exception) {
            $duration = (int) round((hrtime(true) - $started) / 1_000_000);
            $event->update([
                'status' => 'failed',
                'execution_time_ms' => $duration,
                'error_message' => Str::limit($exception->getMessage(), 5000, ''),
            ]);
            $setting->forceFill([
                'connection_status' => 'failed',
                'last_connection_attempt_at' => now(),
                'last_error' => Str::limit($exception->getMessage(), 5000, ''),
            ])->save();

            throw $exception;
        }
    }
}
