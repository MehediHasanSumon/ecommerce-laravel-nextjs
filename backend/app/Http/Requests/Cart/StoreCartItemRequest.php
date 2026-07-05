<?php

namespace App\Http\Requests\Cart;

use Illuminate\Foundation\Http\FormRequest;

class StoreCartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'selected_color' => ['nullable', 'string', 'max:100'],
            'selected_size' => ['nullable', 'string', 'max:100'],
            'selected_attributes' => ['nullable', 'array'],
            'selected_attributes.*.name' => ['required_with:selected_attributes', 'string', 'max:100'],
            'selected_attributes.*.value' => ['required_with:selected_attributes', 'string', 'max:100'],
            'selected_attributes.*.label' => ['nullable', 'string', 'max:100'],
            'selected_options' => ['nullable', 'array'],
        ];
    }
}
