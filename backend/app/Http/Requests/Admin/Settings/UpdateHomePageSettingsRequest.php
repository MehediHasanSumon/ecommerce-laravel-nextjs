<?php

namespace App\Http\Requests\Admin\Settings;

use App\Services\Admin\Settings\CategoryDisplaySettingsService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHomePageSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'home' => ['required', 'array'],
            'home.enable_product_section' => ['required', 'boolean'],
            'home.products_per_section' => ['required', 'integer', Rule::in([8, 12, 16, 20, 24])],
            'home.enable_testimonial_section' => ['required', 'boolean'],
            'categories' => ['required', 'array'],
            'categories.enable_home_category_section' => ['boolean'],
            'categories.category_display_mode' => ['required', Rule::in(CategoryDisplaySettingsService::MODES)],
            'brand' => ['required', 'array'],
            'brand.enabled' => ['required', 'boolean'],
            'brand.show_on_home' => ['required', 'boolean'],
        ];
    }

    protected function passedValidation(): void
    {
        if ($this->input('categories.category_display_mode') === CategoryDisplaySettingsService::MODE_NAVBAR_DROPDOWN_ONLY) {
            $this->merge([
                'categories' => [
                    ...$this->input('categories', []),
                    'enable_home_category_section' => false,
                ],
            ]);
        }
    }
}
