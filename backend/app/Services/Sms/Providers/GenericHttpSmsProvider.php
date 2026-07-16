<?php

namespace App\Services\Sms\Providers;

use App\Models\Settings\SmsSetting;
use App\Services\Sms\Contracts\SmsProvider;
use App\Support\SmsDefaults;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GenericHttpSmsProvider implements SmsProvider
{
    public function send(SmsSetting $settings, string $recipient, string $message): array
    {
        if (! $settings->api_base_url) {
            throw new RuntimeException('The SMS provider API URL is not configured.');
        }

        $configuration = [
            ...SmsDefaults::settings()['provider_configuration'],
            ...(array) $settings->provider_configuration,
        ];
        $request = Http::acceptJson()
            ->timeout((int) $settings->request_timeout)
            ->retry(2, 500, throw: false);

        if ($configuration['format'] === 'json') {
            $request = $request->asJson();
        } elseif ($configuration['format'] === 'form') {
            $request = $request->asForm();
        }

        if ($settings->api_key && ! $configuration['api_key_parameter']) {
            $request = $request->withToken($settings->api_key);
        }
        if ($settings->api_secret && ! $configuration['api_secret_parameter']) {
            $request = $request->withHeader('X-API-Secret', $settings->api_secret);
        }
        if (($settings->username || $settings->password)
            && ! $configuration['username_parameter']
            && ! $configuration['password_parameter']) {
            $request = $request->withBasicAuth((string) $settings->username, (string) $settings->password);
        }

        $payload = [];
        $providerRecipient = $configuration['recipient_format'] === 'digits'
            ? ltrim($recipient, '+')
            : $recipient;
        foreach ([
            $configuration['recipient_parameter'] => $providerRecipient,
            $configuration['message_parameter'] => $message,
            $configuration['sender_parameter'] => $settings->sender_id,
            $configuration['route_parameter'] => $settings->route,
            $configuration['api_key_parameter'] => $settings->api_key,
            $configuration['api_secret_parameter'] => $settings->api_secret,
            $configuration['username_parameter'] => $settings->username,
            $configuration['password_parameter'] => $settings->password,
        ] as $key => $value) {
            if ($key !== '' && $value !== null && $value !== '') {
                $payload[$key] = $value;
            }
        }

        $method = strtolower((string) $configuration['method']);
        $response = $configuration['format'] === 'query'
            ? $request->withQueryParameters($payload)->{$method}($settings->api_base_url)
            : $request->{$method}($settings->api_base_url, $payload);

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
