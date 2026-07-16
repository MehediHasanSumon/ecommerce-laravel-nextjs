<?php

namespace App\Services\Sms;

use App\Models\SmsLog;
use App\Services\Admin\Settings\SmsSettingsService;
use RuntimeException;
use Throwable;

class SmsDeliveryService
{
    public function __construct(
        private readonly SmsSettingsService $settings,
        private readonly SmsProviderManager $providers,
    ) {}

    public function deliver(SmsLog $log): void
    {
        $settings = $this->settings->get();
        if (! $settings->enabled) {
            $log->update(['status' => 'skipped', 'error_message' => 'SMS service is disabled.']);

            return;
        }

        try {
            $result = $this->providers->driver($settings->provider)->send(
                $settings,
                $log->recipient,
                $log->message,
            );
            $log->update([
                'provider' => $settings->provider,
                'status' => 'sent',
                'provider_message_id' => $result['provider_message_id'] ?? null,
                'api_response' => $result['response'] ?? null,
                'error_message' => null,
                'sent_at' => now(),
            ]);
        } catch (Throwable $exception) {
            $log->update([
                'provider' => $settings->provider,
                'status' => 'failed',
                'retry_count' => min(255, (int) $log->retry_count + 1),
                'error_message' => $exception->getMessage(),
                'failed_at' => now(),
            ]);
            throw new RuntimeException($exception->getMessage(), previous: $exception);
        }
    }
}
