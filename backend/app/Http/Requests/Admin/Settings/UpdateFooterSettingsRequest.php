<?php

namespace App\Http\Requests\Admin\Settings;

use App\Services\Admin\Settings\FooterSettingsService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFooterSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_banner_image' => ['nullable', 'string', 'max:1024'],
            'payment_banner_enabled' => ['nullable', 'boolean'],
            'payment_banner_title' => ['nullable', 'string', 'max:120'],
            'social_links' => ['nullable', 'array'],
            'social_links.*.platform' => ['required', 'string', 'max:60', Rule::in(FooterSettingsService::PLATFORMS)],
            'social_links.*.url' => ['nullable', 'string', 'max:1024'],
            'social_links.*.icon' => ['nullable', 'string', 'max:60'],
            'social_links.*.open_in_new_tab' => ['nullable', 'boolean'],
            'social_links.*.status' => ['nullable', 'boolean'],
            'social_links.*.display_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
