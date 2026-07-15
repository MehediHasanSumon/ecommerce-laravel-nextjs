<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\HasManagementIndexRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListUsersRequest extends FormRequest
{
    use HasManagementIndexRules;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            ...$this->sharedRules(['name', 'email', 'status', 'email_verified_at', 'created_at']),
            'status' => ['nullable', Rule::in(['active', 'deactive', 'suspended', 'disabled'])],
            'role' => ['nullable', 'string', 'max:255'],
            'email_verified' => ['nullable', Rule::in(['yes', 'no'])],
        ];
    }
}
