<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHeroSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'mode' => ['required', Rule::in(['simple', 'advanced'])],
            'slider_autoplay' => ['required', 'boolean'],
            'autoplay_delay' => ['required', 'integer', 'min:1000', 'max:30000'],
            'infinite_loop' => ['required', 'boolean'],
            'show_navigation' => ['required', 'boolean'],
            'show_pagination' => ['required', 'boolean'],
            'swipe_support' => ['required', 'boolean'],
            'pause_on_hover' => ['required', 'boolean'],
            'lazy_load_images' => ['required', 'boolean'],
        ];
    }
}
