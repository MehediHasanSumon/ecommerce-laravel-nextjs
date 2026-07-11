<?php

namespace App\Http\Requests\Admin\Settings;

use App\Services\Admin\Settings\CategoryDisplaySettingsService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHomePageSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'home' => ['required', 'array'],
            'home.enable_product_section' => ['required', 'boolean'],
            'home.products_per_section' => ['required', 'integer', Rule::in([8, 12, 16, 20, 24])],
            'home.enable_testimonial_section' => ['required', 'boolean'],
            'home.announcement_enabled' => ['required', 'boolean'],
            'home.announcement_text' => ['nullable', 'string', 'max:255'],
            'home.announcement_link_text' => ['nullable', 'string', 'max:80'],
            'home.announcement_link_url' => ['nullable', 'string', 'max:255', $this->absoluteUrlOrRelativePath()],
            'categories' => ['required', 'array'],
            'categories.enable_home_category_section' => ['boolean'],
            'categories.category_display_mode' => ['required', Rule::in(CategoryDisplaySettingsService::MODES)],
            'brand' => ['required', 'array'],
            'brand.enabled' => ['required', 'boolean'],
            'brand.show_on_home' => ['required', 'boolean'],
        ];
    }

    protected function passedValidation(): void
    {
        if ($this->input('categories.category_display_mode') === CategoryDisplaySettingsService::MODE_NAVBAR_DROPDOWN_ONLY) {
            $this->merge([
                'categories' => [
                    ...$this->input('categories', []),
                    'enable_home_category_section' => false,
                ],
            ]);
        }
    }

    private function absoluteUrlOrRelativePath(): \Closure
    {
        return static function (string $attribute, mixed $value, \Closure $fail): void {
            if ($value === null || $value === '') {
                return;
            }

            $value = trim((string) $value);
            $scheme = parse_url($value, PHP_URL_SCHEME);
            $isAbsoluteUrl = filter_var($value, FILTER_VALIDATE_URL) !== false
                && in_array($scheme, ['http', 'https'], true);
            $isRelativePath = str_starts_with($value, '/')
                && ! str_starts_with($value, '//')
                && ! preg_match('/[\r\n]/', $value);

            if (! $isAbsoluteUrl && ! $isRelativePath) {
                $fail("The {$attribute} field must be a valid URL or relative path.");
            }
        };
    }
}
