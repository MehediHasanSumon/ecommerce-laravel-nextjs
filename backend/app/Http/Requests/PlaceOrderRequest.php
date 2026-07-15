<?php

namespace App\Http\Requests;

use App\Services\Admin\Settings\StoreSettingsService;
use Illuminate\Foundation\Http\FormRequest;

class PlaceOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        $store = app(StoreSettingsService::class)->get();
        if (! $this->user() && (! $store->allow_guest_checkout || $store->require_login_before_checkout)) {
            abort(401, 'Please sign in before checkout.');
        }

        return true;
    }

    public function rules(): array
    {
        $phone = ['required_without:billing_address_id', 'string', 'max:40', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'];

        return [
            'billing_address_id' => ['nullable', 'integer', 'exists:customer_addresses,id'],
            'shipping_address_id' => ['nullable', 'integer', 'exists:customer_addresses,id'],
            'billing_address' => ['nullable', 'array'],
            'shipping_address' => ['nullable', 'array'],
            'billing_address.fullName' => ['required_without_all:billing_address_id,billing_address.full_name', 'string', 'max:255'],
            'billing_address.full_name' => ['required_without_all:billing_address_id,billing_address.fullName', 'string', 'max:255'],
            'billing_address.phone' => $phone,
            'billing_address.email' => ['nullable', 'email', 'max:255'],
            'billing_address.country' => ['required_without:billing_address_id', 'string', 'max:100'],
            'billing_address.state' => ['required_without:billing_address_id', 'string', 'max:120'],
            'billing_address.district' => ['required_without:billing_address_id', 'string', 'max:120'],
            'billing_address.city' => ['required_without:billing_address_id', 'string', 'max:120'],
            'billing_address.area' => ['nullable', 'string', 'max:120'],
            'billing_address.postalCode' => ['nullable', 'string', 'max:40'],
            'billing_address.postal_code' => ['nullable', 'string', 'max:40'],
            'billing_address.addressLine' => ['required_without_all:billing_address_id,billing_address.address_line', 'string', 'max:2000'],
            'billing_address.address_line' => ['required_without_all:billing_address_id,billing_address.addressLine', 'string', 'max:2000'],
            'same_as_billing' => ['sometimes', 'boolean'],
            'shipping_method_id' => ['required', 'integer', 'exists:shipping_methods,id'],
            'payment_method' => ['required', 'string', 'max:80'],
        ];
    }

    public function messages(): array
    {
        return [
            'billing_address.phone.regex' => 'Enter a valid Bangladeshi mobile number.',
        ];
    }
}
