<?php

namespace App\Http\Requests\Admin\Settings;

use App\Support\Security\IpAddress;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSecuritySettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $network = function (string $attribute, mixed $value, \Closure $fail): void {
            if (IpAddress::normalizeNetwork(is_string($value) ? $value : null) === null) {
                $fail("The {$attribute} field must be a valid IPv4, IPv6, or CIDR network.");
            }
        };

        return [
            'auto_blocking_enabled' => ['required', 'boolean'],
            'max_failed_login_attempts' => ['required', 'integer', 'min:1', 'max:1000'],
            'max_password_reset_attempts' => ['required', 'integer', 'min:1', 'max:1000'],
            'max_otp_attempts' => ['required', 'integer', 'min:1', 'max:1000'],
            'max_registration_attempts' => ['required', 'integer', 'min:1', 'max:1000'],
            'max_api_requests' => ['required', 'integer', 'min:1', 'max:1000000'],
            'max_checkout_requests' => ['required', 'integer', 'min:1', 'max:10000'],
            'max_contact_submissions' => ['required', 'integer', 'min:1', 'max:10000'],
            'max_invalid_auth_attempts' => ['required', 'integer', 'min:1', 'max:10000'],
            'max_payment_failures' => ['required', 'integer', 'min:1', 'max:10000'],
            'failed_cod_threshold' => ['sometimes', 'required', 'integer', 'min:1', 'max:1000'],
            'max_not_found_requests' => ['required', 'integer', 'min:1', 'max:10000'],
            'max_bot_requests' => ['required', 'integer', 'min:1', 'max:1000000'],
            'time_window_minutes' => ['required', 'integer', 'min:1', 'max:1440'],
            'temporary_block_duration_minutes' => ['required', 'integer', 'min:1', 'max:525600'],
            'permanent_block_threshold' => ['required', 'integer', 'min:1', 'max:100'],
            'auto_block_critical_ips' => ['sometimes', 'required', 'boolean'],
            'enable_checkout_security' => ['sometimes', 'required', 'boolean'],
            'enable_cod_security' => ['sometimes', 'required', 'boolean'],
            'enable_payment_security' => ['sometimes', 'required', 'boolean'],
            'whitelist_ips' => ['present', 'array', 'max:1000'],
            'whitelist_ips.*' => ['required', 'string', $network],
            'blacklist_ips' => ['present', 'array', 'max:1000'],
            'blacklist_ips.*' => ['required', 'string', $network],
            'trusted_proxies' => ['present', 'array', 'max:1000'],
            'trusted_proxies.*.network' => ['required', 'string', $network],
            'trusted_proxies.*.label' => ['nullable', 'string', 'max:120'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $whitelist = collect($this->input('whitelist_ips', []))->map(fn ($ip) => IpAddress::normalizeNetwork($ip))->filter();
            $blacklist = collect($this->input('blacklist_ips', []))->map(fn ($ip) => IpAddress::normalizeNetwork($ip))->filter();
            if ($whitelist->intersect($blacklist)->isNotEmpty()) {
                $validator->errors()->add('blacklist_ips', 'An address cannot be both whitelisted and blacklisted.');
            }
        });
    }
}
