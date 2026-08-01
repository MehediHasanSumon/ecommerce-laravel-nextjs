<?php

namespace App\Services\Fraud;

use App\Exceptions\FraudProviderException;
use App\Models\Settings\FraudProviderSetting;

class FraudBdOfficialProvider extends AbstractFraudProvider
{
    public function key(): string
    {
        return 'fraudbd';
    }

    public function testConnection(FraudProviderSetting $setting): array
    {
        $this->assertConfigured($setting);
        $endpoint = $setting->sandbox_mode
            ? (string) config('fraud.providers.fraudbd.connection_url')
            : $this->endpoint($setting);
        $payload = $setting->sandbox_mode ? [] : ['phone_number' => '01712345678'];
        $response = $this->http->request(
            $setting,
            'test_connection',
            'POST',
            $endpoint,
            $payload,
            ['api_key' => (string) $setting->api_key],
            null,
            true,
        );

        if (data_get($response, 'body.status') === false) {
            throw new FraudProviderException(
                (string) (data_get($response, 'body.message') ?: 'FraudBD rejected the connection test.'),
                422,
                $response['body'],
            );
        }

        return [
            'connected' => true,
            'provider' => $this->key(),
            'response_time_ms' => $response['response_time_ms'],
            'contract_mode' => 'official_public_api',
        ];
    }

    public function check(FraudProviderSetting $setting, array $input, ?int $fraudCheckId = null): array
    {
        $this->assertConfigured($setting);
        $response = $this->http->request(
            $setting,
            'fraud_check',
            'POST',
            $this->endpoint($setting),
            ['phone_number' => $input['phone']],
            ['api_key' => (string) $setting->api_key],
            $fraudCheckId,
        );
        $body = $response['body'];
        if (data_get($body, 'status') !== true || ! is_array(data_get($body, 'data'))) {
            throw new FraudProviderException(
                (string) (data_get($body, 'message') ?: 'FraudBD returned an invalid response.'),
                422,
                $body,
            );
        }

        $summary = (array) data_get($body, 'data.totalSummary', []);
        $providers = collect((array) data_get($body, 'data.Summaries', []));
        $cancelRate = (float) ($summary['cancelRate'] ?? $summary['cancel_rate'] ?? 0);
        $reportedRiskScores = $providers
            ->map(fn ($item): int => $this->scoreForReportedRisk((string) data_get($item, 'risk_level', '')))
            ->push((int) round($cancelRate));
        $reasons = $providers
            ->map(fn ($item) => data_get($item, 'message'))
            ->filter(fn ($message) => is_string($message) && trim($message) !== '')
            ->values();
        $cancelled = max(0, (int) ($summary['cancel'] ?? 0));
        if ($cancelled > 0) {
            $reasons->push("Courier history includes {$cancelled} cancelled ".str('delivery')->plural($cancelled).'.');
        }

        $score = min(100, max(0, (int) $reportedRiskScores->max()));

        return [
            ...$this->normalizeResult([
                'risk_score' => $score,
                'risk_level' => $this->riskLevel($score),
                'blacklist_status' => null,
                'fraud_matches' => $cancelled,
                'known_scam_reports' => 0,
                'chargeback_reports' => 0,
                'suspicious_activity_count' => $cancelled,
                'risk_reasons' => $reasons->all(),
                'recommendation' => $this->recommendation($score, (float) ($summary['successRate'] ?? 0)),
                'raw_response' => $body,
            ]),
            'response_time_ms' => $response['response_time_ms'],
        ];
    }

    private function assertConfigured(FraudProviderSetting $setting): void
    {
        if (! $setting->api_key) {
            throw new FraudProviderException('Save the FraudBD API key before using this provider.', 422);
        }
    }

    private function endpoint(FraudProviderSetting $setting): string
    {
        if (filled($setting->api_url)) {
            return rtrim((string) $setting->api_url, '/');
        }

        return (string) config(
            $setting->sandbox_mode ? 'fraud.providers.fraudbd.sandbox_url' : 'fraud.providers.fraudbd.production_url'
        );
    }

    private function scoreForReportedRisk(string $risk): int
    {
        return match (mb_strtolower(trim($risk))) {
            'critical', 'very_high' => 90,
            'high', 'risky', 'risky_customer' => 75,
            'medium', 'moderate', 'moderate_customer' => 50,
            'low', 'good', 'good_customer' => 25,
            'safe', 'excellent', 'excellent_customer' => 5,
            default => 0,
        };
    }

    private function recommendation(int $score, float $successRate): string
    {
        return match (true) {
            $score >= 85 => 'Reject or require explicit senior approval before accepting COD or creating a shipment.',
            $score >= 70 => 'Hold the order and verify the customer before COD confirmation or shipment.',
            $score >= 45 => 'Review the courier history and confirm the customer before fulfillment.',
            $successRate > 0 => "Courier delivery success rate is {$successRate}%. Continue with standard verification.",
            default => 'No material courier risk signal was returned. Continue with standard verification.',
        };
    }
}
