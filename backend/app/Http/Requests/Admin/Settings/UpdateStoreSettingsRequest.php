<?php

namespace App\Http\Requests\Admin\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStoreSettingsRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'store_name' => ['required', 'string', 'max:255'],
            'store_url' => ['nullable', 'url', 'max:255'],
            'store_email' => ['nullable', 'email', 'max:255'],
            'store_phone' => ['nullable', 'string', 'max:100'],
            'products_per_page' => ['required', 'integer', 'min:1', 'max:120'],
            'default_product_sorting' => ['required', Rule::in(['latest', 'oldest', 'price_low', 'price_high', 'name_asc', 'name_desc'])],
            'default_product_view' => ['required', Rule::in(['grid', 'list'])],
            'enable_reviews' => ['boolean'],
            'enable_wishlist' => ['boolean'],
            'enable_compare' => ['boolean'],
            'enable_stock_management' => ['boolean'],
            'enable_guest_checkout' => ['boolean'],
            'require_login_before_checkout' => ['boolean'],
            'minimum_order_amount_cents' => ['required', 'integer', 'min:0'],
            'maximum_order_amount_cents' => ['nullable', 'integer', 'min:0', 'gte:minimum_order_amount_cents'],
            'low_stock_threshold' => ['required', 'integer', 'min:0'],
            'allow_backorders' => ['boolean'],
            'hide_out_of_stock_products' => ['boolean'],
        ];
    }
}
