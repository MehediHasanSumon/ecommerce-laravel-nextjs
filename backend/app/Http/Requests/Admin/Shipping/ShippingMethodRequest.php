<?php

namespace App\Http\Requests\Admin\Shipping;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ShippingMethodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shipping_zone_id' => ['required', 'integer', 'exists:shipping_zones,id'],
            'name' => ['required', 'string', 'max:255'],
            'delivery_time' => ['nullable', 'string', 'max:255'],
            'shipping_cost' => ['required', 'numeric', 'min:0'],
            'free_shipping' => ['required', 'boolean'],
            'minimum_order_amount' => ['nullable', 'numeric', 'min:0', 'required_if:free_shipping,true'],
            'status' => ['required', 'boolean'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'description' => ['nullable', 'string', 'max:2000'],
            'delivery_type' => ['nullable', Rule::in(['flat_rate', 'free_shipping', 'local_pickup', 'courier', 'express'])],
        ];
    }
}
