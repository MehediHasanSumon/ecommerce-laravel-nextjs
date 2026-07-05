<?php

namespace App\Http\Requests\Admin\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMaintenanceModeSettingsRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'enabled' => ['boolean'],
            'title' => ['required', 'string', 'max:255'],
            'message' => ['nullable', 'string'],
            'estimated_return_time' => ['nullable', 'date'],
            'allow_admin_access' => ['boolean'],
            'allowed_ip_addresses' => ['nullable', 'array'],
            'allowed_ip_addresses.*' => ['ip'],
            'retry_after' => ['required', 'integer', 'min:60', 'max:86400'],
            'maintenance_image' => ['nullable', 'string', 'max:500'],
        ];
    }
}
