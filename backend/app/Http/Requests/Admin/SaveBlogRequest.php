<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveBlogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'featured_image' => ['nullable', 'required_without:featured_image_file', 'string', 'max:2048'],
            'featured_image_file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,avif,gif', 'max:10240'],
            'excerpt' => ['required', 'string', 'max:1000'],
            'content' => ['required', 'string'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'meta_keywords' => ['nullable', 'string', 'max:500'],
            'canonical_url' => ['nullable', 'url', 'max:2048'],
            'open_graph_image' => ['nullable', 'string', 'max:2048'],
            'author_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
            'published_at' => ['nullable', 'date'],
            'featured' => ['required', 'boolean'],
            'allow_comments_override' => ['nullable', 'boolean'],
        ];
    }
}
