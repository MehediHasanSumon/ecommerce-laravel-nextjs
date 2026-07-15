<?php

namespace App\Http\Requests\Admin;

use App\Services\Orders\OrderService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_type' => ['required', Rule::in(['registered', 'guest', 'new_guest'])],
            'user_id' => ['nullable', 'required_if:customer_type,registered', 'integer', 'exists:users,id'],
            'guest_customer_id' => ['nullable', 'required_if:customer_type,guest', 'integer', 'exists:guest_customers,id'],
            'customer.name' => ['required_if:customer_type,new_guest', 'nullable', 'string', 'max:255'],
            'customer.email' => ['nullable', 'email', 'max:255'],
            'customer.phone' => ['required_if:customer_type,new_guest', 'nullable', 'string', 'max:40'],
            'billing_address' => ['required', 'array'],
            'shipping_address' => ['required', 'array'],
            'billing_address.full_name' => ['required', 'string', 'max:255'],
            'billing_address.phone' => ['required', 'string', 'max:40'],
            'billing_address.email' => ['nullable', 'email', 'max:255'],
            'billing_address.country' => ['required', 'string', 'max:100'],
            'billing_address.state' => ['required', 'string', 'max:120'],
            'billing_address.district' => ['required', 'string', 'max:120'],
            'billing_address.city' => ['required', 'string', 'max:120'],
            'billing_address.area' => ['nullable', 'string', 'max:120'],
            'billing_address.postal_code' => ['nullable', 'string', 'max:40'],
            'billing_address.address_line' => ['required', 'string', 'max:2000'],
            'shipping_address.full_name' => ['required', 'string', 'max:255'],
            'shipping_address.phone' => ['required', 'string', 'max:40'],
            'shipping_address.email' => ['nullable', 'email', 'max:255'],
            'shipping_address.country' => ['required', 'string', 'max:100'],
            'shipping_address.state' => ['required', 'string', 'max:120'],
            'shipping_address.district' => ['required', 'string', 'max:120'],
            'shipping_address.city' => ['required', 'string', 'max:120'],
            'shipping_address.area' => ['nullable', 'string', 'max:120'],
            'shipping_address.postal_code' => ['nullable', 'string', 'max:40'],
            'shipping_address.address_line' => ['required', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
            'shipping_method_id' => ['nullable', 'integer', 'exists:shipping_methods,id'],
            'shipping_charge' => ['nullable', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'coupon_code' => ['nullable', 'string', 'max:100'],
            'coupon_discount' => ['nullable', 'numeric', 'min:0'],
            'additional_discount' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['required', 'string', 'max:80'],
            'payment_status' => ['required', Rule::in(OrderService::PAYMENT_STATUSES)],
            'status' => ['required', Rule::in(OrderService::ORDER_STATUSES)],
            'delivery_notes' => ['nullable', 'string', 'max:5000'],
            'admin_notes' => ['nullable', 'string', 'max:5000'],
            'customer_notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
