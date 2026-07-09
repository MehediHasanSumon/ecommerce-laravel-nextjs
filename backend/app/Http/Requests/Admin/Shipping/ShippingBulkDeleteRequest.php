<?php

namespace App\Http\Requests\Admin\Shipping;

use Illuminate\Foundation\Http\FormRequest;

class ShippingBulkDeleteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $table = str_contains($this->path(), 'shipping-zones') ? 'shipping_zones' : 'shipping_methods';

        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', "exists:{$table},id"],
        ];
    }
}
