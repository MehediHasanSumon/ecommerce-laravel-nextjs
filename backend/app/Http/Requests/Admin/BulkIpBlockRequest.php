<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkIpBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:1000'],
            'ids.*' => ['required', 'integer', 'distinct', 'exists:ip_blocks,id'],
            'action' => ['required', Rule::in(['block', 'unblock', 'delete', 'activate', 'deactivate'])],
            'reason' => ['nullable', 'string', 'max:80', 'required_if:action,block'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ];
    }
}
