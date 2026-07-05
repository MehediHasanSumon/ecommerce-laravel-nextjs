<?php

namespace App\Http\Requests\Admin\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLocalizationSettingsRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'default_language' => ['required', 'string', 'max:10'],
            'default_currency' => ['required', 'string', 'size:3'],
            'timezone' => ['required', 'timezone'],
            'date_format' => ['required', 'string', 'max:50'],
            'time_format' => ['required', Rule::in(['12h', '24h'])],
            'first_day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'rtl_mode' => ['boolean'],
            'decimal_separator' => ['required', 'string', 'max:5'],
            'thousand_separator' => ['required', 'string', 'max:5'],
        ];
    }
}
