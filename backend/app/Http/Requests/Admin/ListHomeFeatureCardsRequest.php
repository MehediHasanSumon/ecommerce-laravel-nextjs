<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\HasManagementIndexRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListHomeFeatureCardsRequest extends FormRequest
{
    use HasManagementIndexRules;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            ...$this->sharedRules(['title', 'icon', 'sort_order', 'status', 'created_at', 'updated_at']),
            'status' => ['nullable', Rule::in(['true', 'false', '1', '0'])],
        ];
    }
}
