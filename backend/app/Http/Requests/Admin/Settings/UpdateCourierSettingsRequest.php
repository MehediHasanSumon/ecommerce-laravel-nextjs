<?php

namespace App\Http\Requests\Admin\Settings;

use App\Services\Admin\Settings\CourierSettingsService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCourierSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $providers = collect($this->input('providers', []))->map(function ($provider): array {
            $provider = (array) $provider;
            if (array_key_exists('custom_cod_amount', $provider)) {
                $provider['custom_cod_amount_cents'] = (int) round(((float) $provider['custom_cod_amount']) * 100);
                unset($provider['custom_cod_amount']);
            }

            return $provider;
        })->all();

        $this->merge(['providers' => $providers]);
    }

    public function rules(): array
    {
        return [
            'providers' => ['required', 'array', 'size:'.count(CourierSettingsService::PROVIDERS)],
            'providers.*.provider' => ['required', Rule::in(CourierSettingsService::PROVIDERS), 'distinct'],
            'providers.*.enabled' => ['required', 'boolean'],
            'providers.*.sandbox_mode' => ['required', 'boolean'],
            'providers.*.api_base_url' => [
                'nullable',
                'url:https',
                'max:1000',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! $value) {
                        return;
                    }

                    preg_match('/providers\.(\d+)\./', $attribute, $matches);
                    $provider = $this->input('providers.'.($matches[1] ?? '').'.provider');
                    $host = mb_strtolower((string) parse_url((string) $value, PHP_URL_HOST));
                    $allowedHosts = match ($provider) {
                        'steadfast' => ['portal.packzy.com'],
                        'pathao' => ['api-hermes.pathao.com', 'courier-api-sandbox.pathao.com'],
                        default => [],
                    };

                    if (! in_array($host, $allowedHosts, true)) {
                        $fail('The API base URL must use an official courier API domain.');
                    }
                },
            ],
            'providers.*.api_key' => ['nullable', 'string', 'max:1000'],
            'providers.*.api_secret' => ['nullable', 'string', 'max:1000'],
            'providers.*.webhook_secret' => ['nullable', 'string', 'max:1000'],
            'providers.*.default_store_id' => ['nullable', 'string', 'max:120'],
            'providers.*.default_parcel_type' => ['required', 'string', 'max:60'],
            'providers.*.default_item_description' => ['nullable', 'string', 'max:500'],
            'providers.*.default_delivery_type' => ['nullable', 'string', 'max:60'],
            'providers.*.default_payment_type' => ['required', Rule::in(['cash_on_delivery', 'prepaid', 'outstanding'])],
            'providers.*.default_weight' => ['required', 'numeric', 'min:0.1', 'max:100'],
            'providers.*.cod_amount_rule' => ['required', Rule::in(['order_total', 'outstanding', 'zero', 'custom'])],
            'providers.*.custom_cod_amount_cents' => ['nullable', 'integer', 'min:0'],
            'providers.*.additional_configuration' => ['nullable', 'array'],
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

                foreach (['api_key' => 'API key', 'api_secret' => 'API secret'] as $field => $label) {
                    $value = trim((string) ($provider[$field] ?? ''));
                    if ($value === '') {
                        $validator->errors()->add("providers.{$index}.{$field}", "{$label} is required when the courier provider is enabled.");
                    }
                }
            }
        });
    }
}
