<?php

namespace App\Http\Requests\Admin\Shipping;

use App\Http\Requests\Admin\Concerns\HasManagementIndexRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ShippingZoneIndexRequest extends FormRequest
{
    use HasManagementIndexRules;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            ...$this->sharedRules(['name', 'status', 'display_order', 'created_at', 'updated_at']),
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ];
    }
}
