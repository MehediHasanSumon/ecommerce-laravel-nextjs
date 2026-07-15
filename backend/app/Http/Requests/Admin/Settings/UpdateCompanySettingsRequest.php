<?php

namespace App\Http\Requests\Admin\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanySettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_name' => ['required', 'string', 'max:255'],
            'legal_company_name' => ['nullable', 'string', 'max:255'],
            'company_email' => ['nullable', 'email', 'max:255'],
            'company_phone' => ['nullable', 'string', 'max:100'],
            'support_email' => ['nullable', 'email', 'max:255'],
            'support_phone' => ['nullable', 'string', 'max:100'],
            'logo' => ['nullable', 'string', 'max:500'],
            'dark_logo' => ['nullable', 'string', 'max:500'],
            'favicon' => ['nullable', 'string', 'max:500'],
            'invoice_logo' => ['nullable', 'string', 'max:500'],
            'country' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:40'],
            'full_address' => ['nullable', 'string'],
            'currency_id' => ['required', 'integer', 'exists:currencies,id'],
            'currency_position' => ['required', Rule::in(['left', 'right'])],
            'decimal_places' => ['required', 'integer', 'min:0', 'max:4'],
            'decimal_separator' => ['required', 'string', 'max:5'],
            'thousands_separator' => ['required', 'string', 'max:5'],
            'timezone' => ['required', 'timezone'],
            'date_format' => ['required', 'string', 'max:50'],
            'time_format' => ['required', Rule::in(['12h', '24h'])],
            'invoice_prefix' => ['required', 'string', 'max:20'],
            'invoice_footer' => ['nullable', 'string'],
        ];
    }
}
