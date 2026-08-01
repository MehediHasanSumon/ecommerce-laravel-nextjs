<?php

namespace App\Http\Requests\Admin\Settings;

use App\Services\Fraud\FraudManager;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFraudSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $providers = app(FraudManager::class)->keys();

        return [
            'settings' => ['required', 'array'],
            'settings.fraud_detection_enabled' => ['required', 'boolean'],
            'settings.fraud_auto_check_orders' => ['required', 'boolean'],
            'settings.fraud_auto_check_customers' => ['required', 'boolean'],
            'settings.fraud_check_during_checkout' => ['required', 'boolean'],
            'settings.fraud_check_before_cod_confirmation' => ['required', 'boolean'],
            'settings.fraud_check_before_shipment' => ['required', 'boolean'],
            'settings.fraud_score_threshold' => ['required', 'integer', 'min:0', 'max:100'],
            'settings.fraud_critical_score_threshold' => ['required', 'integer', 'min:0', 'max:100', 'gte:settings.fraud_score_threshold'],
            'settings.fraud_auto_flag_suspicious_orders' => ['required', 'boolean'],
            'settings.fraud_auto_hold_high_risk_orders' => ['required', 'boolean'],
            'settings.fraud_auto_reject_critical_risk_orders' => ['required', 'boolean'],
            'settings.fraud_block_cod_high_risk' => ['required', 'boolean'],
            'settings.fraud_require_admin_approval' => ['required', 'boolean'],
            'settings.fraud_provider_priority' => ['required', 'array', 'size:'.count($providers)],
            'settings.fraud_provider_priority.*' => ['required', Rule::in($providers), 'distinct'],
            'settings.fraud_result_caching_enabled' => ['required', 'boolean'],
            'settings.fraud_cache_duration_minutes' => ['required', 'integer', 'min:1', 'max:43200'],
            'providers' => ['required', 'array', 'size:'.count($providers)],
            'providers.*.provider' => ['required', Rule::in($providers), 'distinct'],
            'providers.*.enabled' => ['required', 'boolean'],
            'providers.*.sandbox_mode' => ['required', 'boolean'],
            'providers.*.api_url' => [
                'nullable',
                'url:https',
                'max:1000',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! $value) {
                        return;
                    }
                    if (parse_url((string) $value, PHP_URL_QUERY) !== null || parse_url((string) $value, PHP_URL_FRAGMENT) !== null) {
                        $fail('The fraud API URL cannot contain a query string or fragment.');
                    }
                    preg_match('/providers\.(\d+)\./', $attribute, $matches);
                    $provider = $this->input('providers.'.($matches[1] ?? '').'.provider');
                    $host = mb_strtolower((string) parse_url((string) $value, PHP_URL_HOST));
                    $allowedHosts = (array) config("fraud.providers.{$provider}.allowed_hosts", []);
                    if ($allowedHosts !== [] && ! in_array($host, $allowedHosts, true)) {
                        $fail('The fraud API URL must use an approved provider domain.');
                    }
                    if ($host === 'localhost' || str_ends_with($host, '.local') || filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false && filter_var($host, FILTER_VALIDATE_IP)) {
                        $fail('The fraud API URL must use a public HTTPS host.');
                    }
                },
            ],
            'providers.*.api_key' => ['nullable', 'string', 'max:2000'],
            'providers.*.api_secret' => ['nullable', 'string', 'max:2000'],
            'providers.*.additional_configuration' => ['nullable', 'array'],
            'providers.*.additional_configuration.method' => ['nullable', Rule::in(['GET', 'POST'])],
            'providers.*.additional_configuration.phone_field' => ['nullable', 'string', 'max:100'],
            'providers.*.additional_configuration.auth_header' => ['nullable', 'string', 'max:100'],
            'providers.*.additional_configuration.auth_prefix' => ['nullable', 'string', 'max:100'],
            'providers.*.additional_configuration.secret_header' => ['nullable', 'string', 'max:100'],
            'providers.*.additional_configuration.test_phone' => ['nullable', 'regex:/^01[3-9][0-9]{8}$/'],
            'providers.*.additional_configuration.score_path' => ['nullable', 'string', 'max:255'],
            'providers.*.additional_configuration.risk_level_path' => ['nullable', 'string', 'max:255'],
            'providers.*.additional_configuration.blacklist_path' => ['nullable', 'string', 'max:255'],
            'providers.*.additional_configuration.reasons_path' => ['nullable', 'string', 'max:255'],
            'providers.*.additional_configuration.recommendation_path' => ['nullable', 'string', 'max:255'],
            'providers.*.display_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            foreach ((array) $this->input('providers', []) as $index => $provider) {
                if (! ($provider['enabled'] ?? false)) {
                    continue;
                }
                if (trim((string) ($provider['api_key'] ?? '')) === '') {
                    $validator->errors()->add("providers.{$index}.api_key", 'API key is required when the provider is enabled.');
                }
                $providerKey = (string) ($provider['provider'] ?? '');
                if (config("fraud.providers.{$providerKey}.requires_api_url", false) && trim((string) ($provider['api_url'] ?? '')) === '') {
                    $validator->errors()->add("providers.{$index}.api_url", 'Enter the private API endpoint supplied by this provider.');
                }
            }
        });
    }
}
