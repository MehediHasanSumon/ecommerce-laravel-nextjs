<?php

namespace App\Http\Requests\Admin\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateShippingSettingsRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'settings.enable_shipping' => ['boolean'],
            'settings.enable_free_shipping' => ['boolean'],
            'settings.free_shipping_minimum_amount_cents' => ['required_without:settings.free_shipping_minimum_amount', 'integer', 'min:0'],
            'settings.free_shipping_minimum_amount' => ['required_without:settings.free_shipping_minimum_amount_cents', 'numeric', 'min:0'],
            'settings.default_weight_unit' => ['required', Rule::in(['g', 'kg', 'lb', 'oz'])],
            'settings.default_dimension_unit' => ['required', Rule::in(['cm', 'm', 'in'])],
            'zones' => ['array'],
            'zones.*.name' => ['required', 'string', 'max:255'],
            'zones.*.countries' => ['nullable', 'array'],
            'zones.*.states' => ['nullable', 'array'],
            'zones.*.postal_codes' => ['nullable', 'array'],
            'zones.*.status' => ['boolean'],
            'zones.*.display_order' => ['nullable', 'integer', 'min:0'],
            'methods' => ['array'],
            'methods.*.shipping_zone_id' => ['nullable', 'integer', 'exists:shipping_zones,id'],
            'methods.*.name' => ['required', 'string', 'max:255'],
            'methods.*.code' => ['required', 'string', 'max:100'],
            'methods.*.type' => ['required', Rule::in(['flat_rate', 'free_shipping', 'local_pickup'])],
            'methods.*.rate_cents' => ['required_without:methods.*.rate', 'integer', 'min:0'],
            'methods.*.rate' => ['required_without:methods.*.rate_cents', 'numeric', 'min:0'],
            'methods.*.estimated_days_min' => ['nullable', 'integer', 'min:0'],
            'methods.*.estimated_days_max' => ['nullable', 'integer', 'min:0'],
            'methods.*.status' => ['boolean'],
            'methods.*.display_order' => ['nullable', 'integer', 'min:0'],
            'classes' => ['array'],
            'classes.*.name' => ['required', 'string', 'max:255'],
            'classes.*.slug' => ['required', 'string', 'max:255'],
            'classes.*.description' => ['nullable', 'string'],
            'classes.*.additional_fee_cents' => ['required_without:classes.*.additional_fee', 'integer', 'min:0'],
            'classes.*.additional_fee' => ['required_without:classes.*.additional_fee_cents', 'numeric', 'min:0'],
            'classes.*.status' => ['boolean'],
        ];
    }
}
