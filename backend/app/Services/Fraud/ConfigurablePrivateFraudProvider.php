<?php

namespace App\Services\Fraud;

use App\Exceptions\FraudProviderException;
use App\Models\Settings\FraudProviderSetting;

abstract class ConfigurablePrivateFraudProvider extends AbstractFraudProvider
{
    public function testConnection(FraudProviderSetting $setting): array
    {
        $configuration = $this->configuration($setting);
        $phone = (string) ($configuration['test_phone'] ?? '01700000000');
        $result = $this->lookup($setting, ['phone' => $phone], null, true);

        return [
            'connected' => true,
            'provider' => $this->key(),
            'response_time_ms' => $result['response_time_ms'],
            'contract_mode' => 'merchant_configured',
        ];
    }

    public function check(FraudProviderSetting $setting, array $input, ?int $fraudCheckId = null): array
    {
        $result = $this->lookup($setting, $input, $fraudCheckId);

        return [
            ...$this->parse($result['body'], $this->configuration($setting)),
            'response_time_ms' => $result['response_time_ms'],
        ];
    }

    private function lookup(
        FraudProviderSetting $setting,
        array $input,
        ?int $fraudCheckId,
        bool $ignoreCircuit = false,
    ): array {
        $configuration = $this->configuration($setting);
        $endpoint = trim((string) $setting->api_url);
        if ($endpoint === '') {
            throw new FraudProviderException(
                "{$this->label()} does not publish a public API contract. Enter the lookup endpoint supplied in your merchant account.",
                422,
            );
        }
        if (! $setting->api_key) {
            throw new FraudProviderException("Save the {$this->label()} API key before using this provider.", 422);
        }

        $method = strtoupper((string) ($configuration['method'] ?? 'POST'));
        if (! in_array($method, ['GET', 'POST'], true)) {
            throw new FraudProviderException('The configured fraud lookup method must be GET or POST.', 422);
        }

        $phoneField = (string) ($configuration['phone_field'] ?? 'phone');
        $authHeader = (string) ($configuration['auth_header'] ?? 'api_key');
        $authPrefix = (string) ($configuration['auth_prefix'] ?? '');
        $payload = [$phoneField => $input['phone']];
        foreach (['name', 'email', 'ip_address', 'nid', 'order_id', 'customer_id'] as $field) {
            $requestField = $configuration["{$field}_field"] ?? null;
            if (is_string($requestField) && $requestField !== '' && filled($input[$field] ?? null)) {
                $payload[$requestField] = $input[$field];
            }
        }

        $headers = [$authHeader => $authPrefix.(string) $setting->api_key];
        if ($setting->api_secret && filled($configuration['secret_header'] ?? null)) {
            $headers[(string) $configuration['secret_header']] = (string) $setting->api_secret;
        }

        return $this->http->request(
            $setting,
            'fraud_check',
            $method,
            $endpoint,
            $payload,
            $headers,
            $fraudCheckId,
            $ignoreCircuit,
        );
    }

    private function parse(array $body, array $configuration): array
    {
        $successPath = (string) ($configuration['success_path'] ?? '');
        if ($successPath !== '' && data_get($body, $successPath) === false) {
            throw new FraudProviderException(
                (string) (data_get($body, $configuration['message_path'] ?? 'message') ?: "{$this->label()} returned an unsuccessful result."),
                422,
                $body,
            );
        }

        $score = $this->value($body, $configuration, 'score_path', [
            'data.risk_score',
            'data.score',
            'risk_score',
            'score',
        ], 0);
        $riskLevel = $this->value($body, $configuration, 'risk_level_path', [
            'data.risk_level',
            'data.risk',
            'risk_level',
            'risk',
        ]);
        $reasons = $this->value($body, $configuration, 'reasons_path', [
            'data.risk_reasons',
            'data.reasons',
            'risk_reasons',
            'reasons',
        ], []);

        return $this->normalizeResult([
            'risk_score' => $score,
            'risk_level' => is_string($riskLevel) ? mb_strtolower($riskLevel) : null,
            'blacklist_status' => $this->nullableBoolean($this->value($body, $configuration, 'blacklist_path', ['data.blacklisted', 'data.blacklist_status', 'blacklisted'])),
            'fraud_matches' => $this->value($body, $configuration, 'fraud_matches_path', ['data.fraud_matches', 'data.matches', 'fraud_matches'], 0),
            'known_scam_reports' => $this->value($body, $configuration, 'scam_reports_path', ['data.scam_reports', 'data.complaints', 'scam_reports'], 0),
            'chargeback_reports' => $this->value($body, $configuration, 'chargeback_reports_path', ['data.chargeback_reports', 'chargeback_reports'], 0),
            'suspicious_activity_count' => $this->value($body, $configuration, 'suspicious_count_path', ['data.suspicious_activity_count', 'data.suspicious_count'], 0),
            'risk_reasons' => is_array($reasons) ? $reasons : [$reasons],
            'recommendation' => $this->value($body, $configuration, 'recommendation_path', ['data.recommendation', 'recommendation', 'message']),
            'raw_response' => $body,
        ]);
    }

    private function value(array $body, array $configuration, string $configurationKey, array $fallbacks, mixed $default = null): mixed
    {
        $configuredPath = $configuration[$configurationKey] ?? null;
        if (is_string($configuredPath) && $configuredPath !== '') {
            return data_get($body, $configuredPath, $default);
        }

        foreach ($fallbacks as $path) {
            $value = data_get($body, $path);
            if ($value !== null) {
                return $value;
            }
        }

        return $default;
    }

    private function nullableBoolean(mixed $value): ?bool
    {
        if ($value === null || $value === '') {
            return null;
        }

        return filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
    }

    private function configuration(FraudProviderSetting $setting): array
    {
        return (array) ($setting->additional_configuration ?? []);
    }
}
