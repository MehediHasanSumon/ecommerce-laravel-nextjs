<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\HasManagementIndexRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductModuleListRequest extends FormRequest
{
    use HasManagementIndexRules;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $module = (string) $this->route('module');
        $sorts = match ($module) {
            'brands', 'categories', 'tags', 'discounts', 'warehouses' => ['name', 'status', 'created_at', 'updated_at'],
            'currencies' => ['country', 'currency', 'status', 'created_at', 'updated_at'],
            'collections' => ['name', 'status', 'collection_type', 'home_sort_order', 'priority', 'created_at', 'updated_at'],
            'attributes' => ['name', 'type', 'sort_order', 'created_at', 'updated_at'],
            'attribute-values' => ['value', 'sort_order', 'created_at', 'updated_at'],
            'products' => ['name', 'sku', 'status', 'base_price_cents', 'stock_quantity', 'created_at', 'updated_at'],
            'reviews' => ['rating', 'status', 'created_at', 'updated_at'],
            default => ['created_at'],
        };

        return [
            ...$this->sharedRules($sorts),
            'status' => ['nullable', 'string', 'max:50'],
            'type' => ['nullable', 'string', 'max:50'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'attribute_id' => ['nullable', 'integer', 'exists:attributes,id'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'featured' => ['nullable', Rule::in(['yes', 'no'])],
        ];
    }
}
