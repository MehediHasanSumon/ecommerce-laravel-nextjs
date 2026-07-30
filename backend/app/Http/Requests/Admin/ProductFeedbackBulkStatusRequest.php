<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductFeedbackBulkStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $table = (string) $this->route('module') === 'comments'
            ? 'product_comments'
            : 'product_reviews';

        return [
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['required', 'integer', "exists:{$table},id"],
            'status' => ['required', Rule::in(['approved', 'rejected'])],
        ];
    }
}
