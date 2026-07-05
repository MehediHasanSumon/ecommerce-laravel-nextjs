<?php

namespace App\Http\Requests\Admin\Settings;

use App\Services\Admin\Settings\CategoryDisplaySettingsService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCategoryDisplaySettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'enable_home_category_section' => ['boolean'],
            'category_display_mode' => ['required', Rule::in(CategoryDisplaySettingsService::MODES)],
        ];
    }

    protected function passedValidation(): void
    {
        if ($this->input('category_display_mode') === CategoryDisplaySettingsService::MODE_NAVBAR_DROPDOWN_ONLY) {
            $this->merge(['enable_home_category_section' => false]);
        }
    }
}
