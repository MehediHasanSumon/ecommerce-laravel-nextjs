<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBlogCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'parent_id' => ['nullable', 'integer', 'exists:blog_comments,id'],
            'author_name' => ['required', 'string', 'max:120'],
            'author_email' => ['required', 'email', 'max:255'],
            'content' => ['required', 'string', 'min:2', 'max:2000'],
        ];
    }
}
