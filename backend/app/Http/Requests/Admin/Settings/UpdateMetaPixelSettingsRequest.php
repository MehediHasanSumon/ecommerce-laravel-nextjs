<?php

namespace App\Http\Requests\Admin\Settings;

use App\Models\Settings\MetaPixelSetting;
use Illuminate\Foundation\Http\FormRequest;

class UpdateMetaPixelSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'pixel_id' => ['nullable', 'regex:/^[0-9]{5,40}$/'],
            'conversions_api_enabled' => ['required', 'boolean'],
            'access_token' => ['nullable', 'string', 'max:5000'],
            'test_event_code' => ['nullable', 'string', 'max:255'],
            'dataset_id' => ['nullable', 'regex:/^[0-9]{5,80}$/'],
            'automatic_event_tracking' => ['required', 'boolean'],
            'advanced_matching' => ['required', 'boolean'],
            'server_side_tracking' => ['required', 'boolean'],
            'browser_side_tracking' => ['required', 'boolean'],
            'debug_mode' => ['required', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $storedToken = MetaPixelSetting::query()->value('access_token');
            $token = $this->input('access_token');
            $hasToken = filled($token) && $token !== '********' || filled($storedToken);

            if ($this->boolean('enabled') && ! $this->input('pixel_id')) {
                $validator->errors()->add('pixel_id', 'Pixel ID is required when Meta Pixel is enabled.');
            }
            if ($this->boolean('enabled') && $this->boolean('conversions_api_enabled') && ! $hasToken) {
                $validator->errors()->add('access_token', 'Access token is required when Conversions API is enabled.');
            }
            if ($this->boolean('enabled') && ! $this->boolean('server_side_tracking') && ! $this->boolean('browser_side_tracking')) {
                $validator->errors()->add('enabled', 'Enable browser-side or server-side tracking.');
            }
        });
    }
}
