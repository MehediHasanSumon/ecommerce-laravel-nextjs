<?php

namespace App\Services\Courier;

use App\Exceptions\CourierApiException;
use App\Models\CourierApiLog;
use App\Models\CourierShipment;
use App\Models\Settings\CourierProviderSetting;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class CourierHttpClient
{
    public function request(
        CourierProviderSetting $setting,
        string $operation,
        string $method,
        string $endpoint,
        array $payload = [],
        array $headers = [],
        ?CourierShipment $shipment = null,
    ): array {
        $startedAt = hrtime(true);
        $attempt = 0;
        $response = null;
        $exception = null;
        $retryable = in_array(strtoupper($method), ['GET', 'HEAD'], true)
            || in_array($operation, ['authenticate', 'calculate_charge', 'test_connection'], true);
        $maximumAttempts = $retryable
            ? max(1, (int) config('couriers.http.retries', 2) + 1)
            : 1;

        while ($attempt < $maximumAttempts) {
            try {
                $attempt++;
                $request = Http::acceptJson()
                    ->asJson()
                    ->connectTimeout((int) config('couriers.http.connect_timeout', 10))
                    ->timeout((int) config('couriers.http.timeout', 30))
                    ->withHeaders($headers);

                $response = $request->send(strtoupper($method), $endpoint, $payload === []
                    ? []
                    : ['json' => $payload]);

                if (! $this->transient($response) || $attempt >= $maximumAttempts) {
                    break;
                }
            } catch (ConnectionException $caught) {
                $exception = $caught;
                if ($attempt >= $maximumAttempts) {
                    break;
                }
            }

            usleep((int) config('couriers.http.retry_delay_ms', 300) * $attempt * 1000);
        }

        $body = $response ? $this->body($response) : [];
        $duration = (int) round((hrtime(true) - $startedAt) / 1_000_000);
        $successful = $response?->successful() === true;
        $message = $successful ? null : $this->errorMessage($body, $exception);

        CourierApiLog::query()->create([
            'request_id' => (string) Str::uuid(),
            'courier_shipment_id' => $shipment?->id,
            'order_id' => $shipment?->order_id,
            'provider' => $setting->provider,
            'operation' => $operation,
            'method' => strtoupper($method),
            'endpoint' => $endpoint,
            'request_payload' => $this->redact($payload) ?: null,
            'response_payload' => $this->redact($body) ?: null,
            'http_status' => $response?->status(),
            'status' => $successful ? 'success' : 'failed',
            'execution_time_ms' => $duration,
            'retry_count' => max(0, $attempt - 1),
            'error_message' => $message,
        ]);

        if (! $successful) {
            throw new CourierApiException(
                $message ?: 'The courier service could not process the request.',
                $response?->status(),
                $body,
            );
        }

        return $body;
    }

    private function transient(Response $response): bool
    {
        return $response->status() === 429 || $response->serverError();
    }

    private function body(Response $response): array
    {
        $json = $response->json();

        return is_array($json) ? $json : ['raw' => Str::limit($response->body(), 10000, '')];
    }

    private function errorMessage(array $body, ?Throwable $exception): string
    {
        if ($exception) {
            return 'The courier service is temporarily unreachable.';
        }

        $candidate = data_get($body, 'message')
            ?? data_get($body, 'error')
            ?? data_get($body, 'errors.0')
            ?? data_get($body, 'errors');

        if (is_array($candidate)) {
            $candidate = collect($candidate)->flatten()->first();
        }

        return is_string($candidate) && $candidate !== ''
            ? Str::limit(strip_tags($candidate), 1000, '')
            : 'The courier service rejected the request.';
    }

    private function redact(array $payload): array
    {
        $sensitive = ['api_key', 'api-key', 'secret_key', 'secret-key', 'api_secret', 'client_secret', 'access_token', 'refresh_token', 'password', 'webhook_secret'];

        return collect($payload)->mapWithKeys(function ($value, $key) use ($sensitive): array {
            if (in_array(mb_strtolower((string) $key), $sensitive, true)) {
                return [$key => '********'];
            }

            return [$key => is_array($value) ? $this->redact($value) : $value];
        })->all();
    }
}
