<?php

namespace App\Http\Requests\Admin\Settings;

use App\Services\Admin\Settings\SocialMediaSettingsService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSocialMediaSettingsRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'items' => ['required', 'array'],
            'items.*.platform' => ['required', Rule::in(SocialMediaSettingsService::PLATFORMS)],
            'items.*.url' => ['required', 'url', 'max:255'],
            'items.*.icon' => ['nullable', 'string', 'max:255'],
            'items.*.display_order' => ['nullable', 'integer', 'min:0'],
            'items.*.open_in_new_tab' => ['boolean'],
            'items.*.status' => ['boolean'],
        ];
    }
}
