<?php

namespace App\Services\Fraud;

use App\Exceptions\FraudProviderException;
use App\Models\FraudApiLog;
use App\Models\Settings\FraudProviderSetting;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class FraudHttpClient
{
    public function request(
        FraudProviderSetting $setting,
        string $operation,
        string $method,
        string $endpoint,
        array $payload = [],
        array $headers = [],
        ?int $fraudCheckId = null,
        bool $ignoreCircuit = false,
    ): array {
        $this->assertSafeEndpoint($setting, $endpoint);

        if (! $ignoreCircuit && $setting->circuit_open_until?->isFuture()) {
            throw new FraudProviderException(
                "The {$setting->provider} fraud provider circuit is temporarily open.",
                503,
            );
        }

        $startedAt = hrtime(true);
        $attempt = 0;
        $response = null;
        $exception = null;
        $maximumAttempts = max(1, (int) config('fraud.http.retries', 1) + 1);

        while ($attempt < $maximumAttempts) {
            try {
                $attempt++;
                $request = Http::acceptJson()
                    ->asJson()
                    ->connectTimeout((int) config('fraud.http.connect_timeout', 3))
                    ->timeout((int) config('fraud.http.timeout', 8))
                    ->withHeaders($headers);
                $requestMethod = strtoupper($method);
                $response = $request->send($requestMethod, $endpoint, $payload === []
                    ? []
                    : [$requestMethod === 'GET' ? 'query' : 'json' => $payload]);

                if (! $this->transient($response) || $attempt >= $maximumAttempts) {
                    break;
                }
            } catch (ConnectionException $caught) {
                $exception = $caught;
                if ($attempt >= $maximumAttempts) {
                    break;
                }
            }

            usleep((int) config('fraud.http.retry_delay_ms', 250) * $attempt * 1000);
        }

        $body = $response ? $this->body($response) : [];
        $duration = (int) round((hrtime(true) - $startedAt) / 1_000_000);
        $successful = $response?->successful() === true;
        $message = $successful ? null : $this->errorMessage($body, $exception);

        FraudApiLog::query()->create([
            'request_id' => (string) Str::uuid(),
            'fraud_check_id' => $fraudCheckId,
            'provider' => $setting->provider,
            'operation' => $operation,
            'method' => strtoupper($method),
            'endpoint' => $endpoint,
            'request_payload' => $this->redact($payload) ?: null,
            'response_payload' => $this->redact($body) ?: null,
            'http_status' => $response?->status(),
            'status' => $successful ? 'success' : 'failed',
            'response_time_ms' => $duration,
            'retry_count' => max(0, $attempt - 1),
            'error_message' => $message,
        ]);

        $this->updateCircuit($setting, $successful, $message);

        if (! $successful) {
            throw new FraudProviderException(
                $message ?: 'The fraud provider could not process the request.',
                $response?->status(),
                $body,
            );
        }

        return ['body' => $body, 'response_time_ms' => $duration, 'http_status' => $response->status()];
    }

    private function transient(Response $response): bool
    {
        return $response->status() === 429 || $response->serverError();
    }

    private function body(Response $response): array
    {
        $json = $response->json();

        return is_array($json) ? $json : ['raw' => Str::limit($response->body(), 20000, '')];
    }

    private function errorMessage(array $body, ?Throwable $exception): string
    {
        if ($exception) {
            return 'The fraud provider is temporarily unreachable.';
        }

        $candidate = data_get($body, 'message')
            ?? data_get($body, 'error.message')
            ?? data_get($body, 'error')
            ?? data_get($body, 'errors.0')
            ?? data_get($body, 'errors');

        if (is_array($candidate)) {
            $candidate = collect($candidate)->flatten()->first();
        }

        return is_string($candidate) && trim($candidate) !== ''
            ? Str::limit(strip_tags($candidate), 1000, '')
            : 'The fraud provider rejected the request.';
    }

    private function redact(array $payload): array
    {
        $sensitive = ['api_key', 'api-key', 'x-api-key', 'secret', 'api_secret', 'token', 'authorization', 'password'];

        return collect($payload)->mapWithKeys(function ($value, $key) use ($sensitive): array {
            if (in_array(mb_strtolower((string) $key), $sensitive, true)) {
                return [$key => '********'];
            }

            return [$key => is_array($value) ? $this->redact($value) : $value];
        })->all();
    }

    private function updateCircuit(FraudProviderSetting $setting, bool $successful, ?string $message): void
    {
        $setting->last_connection_attempt_at = now();

        if ($successful) {
            $setting->forceFill([
                'connection_status' => 'connected',
                'last_successful_connection_at' => now(),
                'last_error' => null,
                'consecutive_failures' => 0,
                'circuit_open_until' => null,
            ])->save();

            return;
        }

        $failures = (int) $setting->consecutive_failures + 1;
        $threshold = max(1, (int) config('fraud.circuit_breaker.failure_threshold', 5));
        $setting->forceFill([
            'connection_status' => 'failed',
            'last_error' => Str::limit($message ?: 'Provider request failed.', 5000, ''),
            'consecutive_failures' => $failures,
            'circuit_open_until' => $failures >= $threshold
                ? now()->addMinutes(max(1, (int) config('fraud.circuit_breaker.cooldown_minutes', 10)))
                : null,
        ])->save();
    }

    private function assertSafeEndpoint(FraudProviderSetting $setting, string $endpoint): void
    {
        $parts = parse_url($endpoint);
        $scheme = mb_strtolower((string) ($parts['scheme'] ?? ''));
        $host = mb_strtolower((string) ($parts['host'] ?? ''));
        if ($scheme !== 'https' || $host === '' || isset($parts['user']) || isset($parts['pass'])) {
            throw new FraudProviderException('Fraud provider endpoints must use a public HTTPS URL.', 422);
        }
        if (isset($parts['query']) || isset($parts['fragment'])) {
            throw new FraudProviderException('Fraud provider endpoints cannot contain a query string or fragment.', 422);
        }
        $allowedHosts = (array) config("fraud.providers.{$setting->provider}.allowed_hosts", []);
        if ($allowedHosts !== [] && ! in_array($host, $allowedHosts, true)) {
            throw new FraudProviderException("{$setting->provider} requests must use an approved provider domain.", 422);
        }
        if ($host === 'localhost' || str_ends_with($host, '.localhost') || str_ends_with($host, '.local')) {
            throw new FraudProviderException('Local or private fraud provider endpoints are not allowed.', 422);
        }
        if (filter_var($host, FILTER_VALIDATE_IP) && ! filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            throw new FraudProviderException('Private or reserved fraud provider IP addresses are not allowed.', 422);
        }
    }
}
