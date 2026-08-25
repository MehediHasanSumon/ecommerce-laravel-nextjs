<?php

namespace App\Services\Sms\Providers;

use App\Models\Settings\SmsSetting;
use App\Services\Sms\Contracts\SmsProvider;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GenericHttpSmsProvider implements SmsProvider
{
    public function send(SmsSetting $settings, string $recipient, string $message): array
    {
        if (! $settings->api_base_url) {
            throw new RuntimeException('The SMS provider API URL is not configured.');
        }

        $request = Http::acceptJson()
            ->timeout(15)
            ->retry(2, 500, throw: false);

        if ($settings->api_key) {
            $request = $request->withToken($settings->api_key);
        }
        if ($settings->api_secret) {
            $request = $request->withHeader('X-API-Secret', $settings->api_secret);
        }

        $payload = [
            'to' => ltrim($recipient, '+'),
            'message' => $message,
        ];
        if ($settings->sender_id) {
            $payload['sender_id'] = $settings->sender_id;
        }

        $response = $request->asJson()->post($settings->api_base_url, $payload);

        $responsePayload = $response->json();
        $responsePayload = is_array($responsePayload) ? $responsePayload : ['body' => $response->body()];
        $providerError = $responsePayload['error_message']
            ?? $responsePayload['error']
            ?? (is_string($responsePayload['errors'] ?? null) ? $responsePayload['errors'] : null);

        if (! $response->successful() || filled($providerError)) {
            throw new RuntimeException(
                (string) ($providerError ?? $responsePayload['message'] ?? "SMS provider returned HTTP {$response->status()}.")
            );
        }

        return [
            'provider_message_id' => $responsePayload['message_id'] ?? $responsePayload['id'] ?? $responsePayload['sms_id'] ?? null,
            'response' => [
                'http_status' => $response->status(),
                'payload' => $responsePayload,
            ],
        ];
    }
}
