<?php

namespace App\Http\Requests\Admin\Settings;

use App\Services\Admin\Settings\PaymentSettingsService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePaymentSettingsRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'gateways' => ['required', 'array', 'min:1'],
            'gateways.*.gateway' => ['required', Rule::in(PaymentSettingsService::GATEWAYS)],
            'gateways.*.enabled' => ['boolean'],
            'gateways.*.sandbox_mode' => ['boolean'],
            'gateways.*.public_key' => ['nullable', 'string', 'max:500'],
            'gateways.*.secret_key' => ['nullable', 'string', 'max:500'],
            'gateways.*.api_key' => ['nullable', 'string', 'max:500'],
            'gateways.*.merchant_id' => ['nullable', 'string', 'max:255'],
            'gateways.*.webhook_secret' => ['nullable', 'string', 'max:500'],
            'gateways.*.additional_configuration' => ['nullable', 'array'],
            'gateways.*.display_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
