<?php

namespace App\Http\Requests;

use App\Services\Admin\Settings\StoreSettingsService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'guest_name' => $this->cleanText($this->input('guest_name')),
            'guest_email' => mb_strtolower(trim((string) $this->input('guest_email'))),
            'content' => $this->cleanText($this->input('content')),
        ]);
    }

    public function rules(): array
    {
        $settings = app(StoreSettingsService::class)->get();
        $guest = ! $this->user();

        return [
            'content' => ['required', 'string', 'min:2', 'max:2000'],
            'guest_name' => [
                Rule::requiredIf($guest && (bool) $settings->guest_name_required),
                'nullable',
                'string',
                'max:120',
            ],
            'guest_email' => [
                Rule::requiredIf($guest && (bool) $settings->guest_email_required),
                'nullable',
                'email:rfc',
                'max:255',
            ],
            'website' => ['nullable', 'max:0'],
        ];
    }

    private function cleanText(mixed $value): string
    {
        return preg_replace('/\s+/u', ' ', trim(strip_tags((string) $value))) ?? '';
    }
}
