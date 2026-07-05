<?php

namespace App\Http\Requests\Admin\Settings;

use App\Services\Admin\Settings\SmsProviderSettingsService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSmsProviderSettingsRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'providers' => ['required', 'array', 'min:1'],
            'providers.*.provider' => ['required', Rule::in(SmsProviderSettingsService::PROVIDERS)],
            'providers.*.api_key' => ['nullable', 'string', 'max:500'],
            'providers.*.api_secret' => ['nullable', 'string', 'max:500'],
            'providers.*.sender_id' => ['nullable', 'string', 'max:100'],
            'providers.*.base_url' => ['nullable', 'url', 'max:500'],
            'providers.*.is_default' => ['boolean'],
            'providers.*.status' => ['boolean'],
        ];
    }
}
