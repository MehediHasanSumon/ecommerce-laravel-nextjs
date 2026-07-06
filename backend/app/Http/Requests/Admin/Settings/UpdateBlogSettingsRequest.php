<?php

namespace App\Http\Requests\Admin\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBlogSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'layout' => ['required', Rule::in(['grid', 'list'])],
            'list_enable_thumbnail' => ['required', 'boolean'],
            'list_show_excerpt' => ['required', 'boolean'],
            'list_show_author' => ['required', 'boolean'],
            'list_show_published_date' => ['required', 'boolean'],
            'list_show_reading_time' => ['required', 'boolean'],
            'show_on_home' => ['required', 'boolean'],
            'home_limit' => ['required', 'integer', Rule::in([3, 4, 6, 8])],
            'allow_comments' => ['required', 'boolean'],
            'enable_related' => ['required', 'boolean'],
            'enable_search' => ['required', 'boolean'],
            'default_meta_title' => ['nullable', 'string', 'max:255'],
            'default_meta_description' => ['nullable', 'string', 'max:500'],
            'open_graph_image' => ['nullable', 'string', 'max:2048'],
            'canonical_url' => ['nullable', 'url', 'max:2048'],
        ];
    }
}
