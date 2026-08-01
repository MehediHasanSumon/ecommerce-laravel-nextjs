<?php

namespace App\Http\Requests\Admin\Settings;

use App\Models\Settings\GoogleAnalyticsSetting;
use Illuminate\Foundation\Http\FormRequest;

class UpdateGoogleAnalyticsSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'measurement_id' => ['nullable', 'regex:/^G-[A-Z0-9]{4,20}$/'],
            'api_secret' => ['nullable', 'string', 'max:5000'],
            'enhanced_ecommerce' => ['required', 'boolean'],
            'debug_mode' => ['required', 'boolean'],
            'user_id_tracking' => ['required', 'boolean'],
            'server_side_events' => ['required', 'boolean'],
            'client_side_events' => ['required', 'boolean'],
            'anonymize_ip' => ['required', 'boolean'],
            'respect_consent_mode' => ['required', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $storedSecret = GoogleAnalyticsSetting::query()->value('api_secret');
            $secret = $this->input('api_secret');
            $hasSecret = filled($secret) && $secret !== '********' || filled($storedSecret);

            if ($this->boolean('enabled') && ! $this->input('measurement_id')) {
                $validator->errors()->add('measurement_id', 'Measurement ID is required when Google Analytics is enabled.');
            }
            if ($this->boolean('enabled') && $this->boolean('server_side_events') && ! $hasSecret) {
                $validator->errors()->add('api_secret', 'Measurement Protocol API secret is required for server-side events.');
            }
            if ($this->boolean('enabled') && ! $this->boolean('server_side_events') && ! $this->boolean('client_side_events')) {
                $validator->errors()->add('enabled', 'Enable client-side or server-side events.');
            }
        });
    }
}
