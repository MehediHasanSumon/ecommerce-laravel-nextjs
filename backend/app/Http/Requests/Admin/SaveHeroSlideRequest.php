<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveHeroSlideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:120'],
            'background_image' => ['nullable', 'string', 'max:2048'],
            'mobile_image' => ['nullable', 'string', 'max:2048'],
            'title' => ['nullable', 'string', 'max:180'],
            'subtitle' => ['nullable', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:1000'],
            'primary_button_text' => ['nullable', 'string', 'max:80'],
            'primary_button_url' => ['nullable', 'string', 'max:2048'],
            'secondary_button_text' => ['nullable', 'string', 'max:80'],
            'secondary_button_url' => ['nullable', 'string', 'max:2048'],
            'text_alignment' => ['required', Rule::in(['left', 'center', 'right'])],
            'overlay' => ['required', 'boolean'],
            'overlay_opacity' => ['required', 'integer', 'min:0', 'max:100'],
            'background_color' => ['nullable', 'string', 'max:32'],
            'background_gradient' => ['nullable', 'string', 'max:500'],
            'background_overlay' => ['required', 'boolean'],
            'canvas_overlay_opacity' => ['required', 'integer', 'min:0', 'max:100'],
            'canvas_size' => ['nullable', 'array'],
            'status' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0'],
            'elements' => ['sometimes', 'array'],
            'elements.*.id' => ['nullable', 'integer', 'exists:hero_slide_elements,id'],
            'elements.*.type' => ['required_with:elements', Rule::in(['heading', 'subheading', 'paragraph', 'button', 'image', 'shape'])],
            'elements.*.name' => ['nullable', 'string', 'max:120'],
            'elements.*.content' => ['nullable', 'array'],
            'elements.*.style' => ['nullable', 'array'],
            'elements.*.responsive' => ['nullable', 'array'],
            'elements.*.z_index' => ['required_with:elements', 'integer', 'min:0', 'max:999'],
            'elements.*.locked' => ['required_with:elements', 'boolean'],
            'elements.*.hidden' => ['required_with:elements', 'boolean'],
        ];
    }
}
