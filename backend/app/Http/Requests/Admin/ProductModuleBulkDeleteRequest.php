<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ProductModuleBulkDeleteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $table = match ((string) $this->route('module')) {
            'attribute-values' => 'attribute_values',
            'collections' => 'collections',
            'currencies' => 'currencies',
            'reviews' => 'product_reviews',
            default => str_replace('-', '_', (string) $this->route('module')),
        };

        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', "exists:{$table},id"],
        ];
    }
}
