<?php

namespace App\Services\Fraud;

use App\Contracts\Fraud\FraudProvider;
use App\Models\Settings\FraudProviderSetting;

abstract class AbstractFraudProvider implements FraudProvider
{
    public function __construct(protected readonly FraudHttpClient $http) {}

    public function label(): string
    {
        return (string) config("fraud.providers.{$this->key()}.label", str($this->key())->headline());
    }

    public function capabilities(): array
    {
        return [
            'phone_lookup' => true,
            'email_lookup' => false,
            'ip_lookup' => false,
            'identity_lookup' => false,
            'public_contract' => (bool) config("fraud.providers.{$this->key()}.public_contract", false),
        ];
    }

    protected function riskLevel(int $score): string
    {
        return match (true) {
            $score >= (int) config('fraud.risk_levels.critical', 85) => 'critical',
            $score >= (int) config('fraud.risk_levels.high', 70) => 'high',
            $score >= (int) config('fraud.risk_levels.medium', 45) => 'medium',
            $score >= (int) config('fraud.risk_levels.low', 20) => 'low',
            default => 'safe',
        };
    }

    protected function normalizeResult(array $result): array
    {
        $score = min(100, max(0, (int) round((float) ($result['risk_score'] ?? 0))));

        return [
            'risk_score' => $score,
            'risk_level' => $result['risk_level'] ?? $this->riskLevel($score),
            'blacklist_status' => array_key_exists('blacklist_status', $result) ? $result['blacklist_status'] : null,
            'fraud_matches' => max(0, (int) ($result['fraud_matches'] ?? 0)),
            'known_scam_reports' => max(0, (int) ($result['known_scam_reports'] ?? 0)),
            'chargeback_reports' => max(0, (int) ($result['chargeback_reports'] ?? 0)),
            'suspicious_activity_count' => max(0, (int) ($result['suspicious_activity_count'] ?? 0)),
            'risk_reasons' => collect($result['risk_reasons'] ?? [])->filter(fn ($reason) => is_string($reason) && trim($reason) !== '')->map(fn ($reason) => trim(strip_tags($reason)))->unique()->values()->all(),
            'recommendation' => isset($result['recommendation']) ? trim(strip_tags((string) $result['recommendation'])) : null,
            'raw_response' => (array) ($result['raw_response'] ?? []),
        ];
    }
}
