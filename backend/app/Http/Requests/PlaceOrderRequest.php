<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PlaceOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'billing_address_id' => ['nullable', 'integer', 'exists:customer_addresses,id'],
            'shipping_address_id' => ['nullable', 'integer', 'exists:customer_addresses,id'],
            'billing_address' => ['nullable', 'array'],
            'shipping_address' => ['nullable', 'array'],
            'same_as_billing' => ['sometimes', 'boolean'],
            'shipping_method_id' => ['required', 'integer', 'exists:shipping_methods,id'],
            'payment_method' => ['required', 'string', 'max:80'],
        ];
    }
}
