<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class BulkDeleteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $table = match ($this->route()->getPrefix()) {
            'api/admin' => $this->segment(3) ?? 'users',
            default => 'users',
        };

        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', "exists:{$table},id"],
        ];
    }
}
