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
            'enable_device_content' => ['sometimes', 'boolean'],
            'device_content' => ['sometimes', 'nullable', 'array'],
            'device_content.desktop' => ['sometimes', 'nullable', 'array'],
            'device_content.tablet' => ['sometimes', 'nullable', 'array'],
            'device_content.mobile' => ['sometimes', 'nullable', 'array'],
            'device_content.*.background_image' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'device_content.*.title' => ['sometimes', 'nullable', 'string', 'max:180'],
            'device_content.*.subtitle' => ['sometimes', 'nullable', 'string', 'max:180'],
            'device_content.*.description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'device_content.*.primary_button_text' => ['sometimes', 'nullable', 'string', 'max:80'],
            'device_content.*.primary_button_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'device_content.*.secondary_button_text' => ['sometimes', 'nullable', 'string', 'max:80'],
            'device_content.*.secondary_button_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'device_content.*.text_alignment' => ['sometimes', 'nullable', Rule::in(['left', 'center', 'right'])],
            'device_content.*.overlay' => ['sometimes', 'nullable', 'boolean'],
            'device_content.*.overlay_opacity' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
        ];
    }
}
