<?php

namespace App\Http\Requests\Admin\Shipping;

use App\Http\Requests\Admin\Concerns\HasManagementIndexRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ShippingMethodIndexRequest extends FormRequest
{
    use HasManagementIndexRules;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            ...$this->sharedRules(['name', 'shipping_zone_id', 'rate_cents', 'status', 'display_order', 'created_at', 'updated_at']),
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'shipping_zone_id' => ['nullable', 'integer', 'exists:shipping_zones,id'],
        ];
    }
}
