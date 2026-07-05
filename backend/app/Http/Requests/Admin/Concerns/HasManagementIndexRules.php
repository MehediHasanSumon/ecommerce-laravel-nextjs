<?php

namespace App\Http\Requests\Admin\Concerns;

use Illuminate\Validation\Rule;

trait HasManagementIndexRules
{
    protected function sharedRules(array $sorts): array
    {
        return [
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            'search' => ['nullable', 'string', 'max:255'],
            'created_from' => ['nullable', 'date'],
            'created_to' => ['nullable', 'date'],
            'updated_from' => ['nullable', 'date'],
            'updated_to' => ['nullable', 'date'],
            'sort' => ['nullable', Rule::in($sorts)],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ];
    }
}
