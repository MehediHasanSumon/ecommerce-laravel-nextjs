<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\HasManagementIndexRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListBlogsRequest extends FormRequest
{
    use HasManagementIndexRules;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            ...$this->sharedRules(['title', 'slug', 'status', 'published_at', 'views_count', 'created_at', 'updated_at']),
            'status' => ['nullable', Rule::in(['draft', 'published', 'scheduled', 'archived'])],
            'featured' => ['nullable', Rule::in(['yes', 'no'])],
        ];
    }
}
