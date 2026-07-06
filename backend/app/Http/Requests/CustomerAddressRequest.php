<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CustomerAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    public function rules(): array
    {
        return [
            'full_name' => ['sometimes', 'string', 'max:255'],
            'fullName' => ['required_without:full_name', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'country' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'max:120'],
            'district' => ['required', 'string', 'max:120'],
            'city' => ['required', 'string', 'max:120'],
            'area' => ['nullable', 'string', 'max:120'],
            'postal_code' => ['sometimes', 'nullable', 'string', 'max:40'],
            'postalCode' => ['sometimes', 'nullable', 'string', 'max:40'],
            'address_line' => ['sometimes', 'string', 'max:2000'],
            'addressLine' => ['required_without:address_line', 'string', 'max:2000'],
            'is_default_billing' => ['sometimes', 'boolean'],
            'isDefaultBilling' => ['sometimes', 'boolean'],
            'is_default_shipping' => ['sometimes', 'boolean'],
            'isDefaultShipping' => ['sometimes', 'boolean'],
        ];
    }
}
