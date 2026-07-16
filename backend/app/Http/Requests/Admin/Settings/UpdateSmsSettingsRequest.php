<?php

namespace App\Http\Requests\Admin\Settings;

use App\Services\Orders\OrderService;
use App\Support\SmsDefaults;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSmsSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'provider' => ['required', Rule::in(['generic_http'])],
            'provider_configuration' => ['required', 'array'],
            'provider_configuration.method' => ['required', Rule::in(['GET', 'POST'])],
            'provider_configuration.format' => ['required', Rule::in(['json', 'form', 'query'])],
            'provider_configuration.recipient_format' => ['required', Rule::in(['digits', 'e164'])],
            'provider_configuration.recipient_parameter' => ['required', 'string', 'max:100'],
            'provider_configuration.message_parameter' => ['required', 'string', 'max:100'],
            'provider_configuration.sender_parameter' => ['nullable', 'string', 'max:100'],
            'provider_configuration.route_parameter' => ['nullable', 'string', 'max:100'],
            'provider_configuration.api_key_parameter' => ['nullable', 'string', 'max:100'],
            'provider_configuration.api_secret_parameter' => ['nullable', 'string', 'max:100'],
            'provider_configuration.username_parameter' => ['nullable', 'string', 'max:100'],
            'provider_configuration.password_parameter' => ['nullable', 'string', 'max:100'],
            'api_base_url' => ['nullable', 'url:http,https', 'max:1000', Rule::requiredIf($this->boolean('enabled'))],
            'api_key' => ['nullable', 'string', 'max:5000'],
            'api_secret' => ['nullable', 'string', 'max:5000'],
            'username' => ['nullable', 'string', 'max:5000'],
            'password' => ['nullable', 'string', 'max:5000'],
            'sender_id' => ['nullable', 'string', 'max:120'],
            'route' => ['nullable', 'string', 'max:120'],
            'default_country_code' => ['required', 'regex:/^\d{1,4}$/'],
            'request_timeout' => ['required', 'integer', 'min:1', 'max:60'],
            'test_number' => ['nullable', 'string', 'max:40', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
            'require_guest_checkout_otp' => ['required', 'boolean'],
            'require_registered_checkout_otp' => ['required', 'boolean'],
            'otp_length' => ['required', 'integer', 'min:4', 'max:8'],
            'otp_expiration_minutes' => ['required', 'integer', 'min:1', 'max:30'],
            'otp_resend_cooldown_seconds' => ['required', 'integer', 'min:15', 'max:600'],
            'otp_max_resends' => ['required', 'integer', 'min:0', 'max:10'],
            'otp_max_verification_attempts' => ['required', 'integer', 'min:1', 'max:10'],
            'otp_rate_limit_per_hour' => ['required', 'integer', 'min:1', 'max:100'],
            'order_confirmation_enabled' => ['required', 'boolean'],
            'order_status_events' => ['required', 'array:'.implode(',', OrderService::ORDER_STATUSES)],
            'order_status_events.*' => ['boolean'],
            'shipping_status_events' => ['required', 'array:'.implode(',', OrderService::SHIPPING_STATUSES)],
            'shipping_status_events.*' => ['boolean'],
            'templates' => ['required', 'array'],
            'templates.*.event' => ['required', 'string', Rule::in(array_column(SmsDefaults::templates(), 'event'))],
            'templates.*.body' => ['required', 'string', 'max:2000', function (string $attribute, mixed $value, \Closure $fail): void {
                preg_match_all('/\{([a-z_]+)\}/', (string) $value, $matches);
                $invalid = array_diff($matches[1] ?? [], SmsDefaults::PLACEHOLDERS);
                if ($invalid !== []) {
                    $fail('The template contains unsupported placeholders: '.implode(', ', $invalid).'.');
                }
            }],
            'templates.*.enabled' => ['required', 'boolean'],
        ];
    }
}
