<?php

namespace App\Http\Requests\Admin\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSeoSettingsRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'site_title' => ['nullable', 'string', 'max:255'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
            'meta_keywords' => ['nullable', 'string'],
            'canonical_url' => ['nullable', 'url', 'max:255'],
            'robots_index' => ['boolean'],
            'robots_follow' => ['boolean'],
            'robots_archive' => ['boolean'],
            'enable_sitemap' => ['boolean'],
            'sitemap_url' => ['nullable', 'url', 'max:255'],
            'og_title' => ['nullable', 'string', 'max:255'],
            'og_description' => ['nullable', 'string'],
            'og_image' => ['nullable', 'string', 'max:500'],
            'twitter_card_type' => ['required', Rule::in(['summary', 'summary_large_image', 'app', 'player'])],
            'twitter_title' => ['nullable', 'string', 'max:255'],
            'twitter_description' => ['nullable', 'string'],
            'twitter_image' => ['nullable', 'string', 'max:500'],
            'google_analytics_id' => ['nullable', 'string', 'max:100'],
            'google_tag_manager_id' => ['nullable', 'string', 'max:100'],
            'facebook_pixel_id' => ['nullable', 'string', 'max:100'],
        ];
    }
}
