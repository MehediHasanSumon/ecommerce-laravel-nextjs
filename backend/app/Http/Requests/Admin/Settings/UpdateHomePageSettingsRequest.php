<?php

namespace App\Http\Requests\Admin\Settings;

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
            'enable_product_section' => ['required', 'boolean'],
            'products_per_section' => ['required', 'integer', Rule::in([8, 12, 16, 20, 24])],
            'enable_testimonial_section' => ['required', 'boolean'],
        ];
    }
}
