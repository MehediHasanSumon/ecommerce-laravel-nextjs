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
            'phone' => ['required', 'string', 'max:40', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
            'alternative_phone' => ['sometimes', 'nullable', 'string', 'max:40', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
            'alternativePhone' => ['sometimes', 'nullable', 'string', 'max:40', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
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
            'landmark' => ['sometimes', 'nullable', 'string', 'max:255'],
            'address_label' => ['sometimes', 'nullable', 'string', 'max:40', 'in:Home,Office,Other,home,office,other'],
            'addressLabel' => ['sometimes', 'nullable', 'string', 'max:40', 'in:Home,Office,Other,home,office,other'],
            'is_default_billing' => ['sometimes', 'boolean'],
            'isDefaultBilling' => ['sometimes', 'boolean'],
            'is_default_shipping' => ['sometimes', 'boolean'],
            'isDefaultShipping' => ['sometimes', 'boolean'],
            'isDefault' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'Enter a valid Bangladeshi mobile number.',
            'alternative_phone.regex' => 'Enter a valid Bangladeshi alternative mobile number.',
            'alternativePhone.regex' => 'Enter a valid Bangladeshi alternative mobile number.',
        ];
    }
}
