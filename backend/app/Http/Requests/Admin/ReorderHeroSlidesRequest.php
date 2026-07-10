<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ReorderHeroSlidesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'slides' => ['required', 'array', 'min:1'],
            'slides.*.id' => ['required', 'integer', 'exists:hero_slides,id'],
            'slides.*.sort_order' => ['required', 'integer', 'min:0'],
        ];
    }
}
