<?php

namespace App\Http\Requests\Admin\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStoreSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'enable_reviews' => ['boolean'],
            'enable_wishlist' => ['boolean'],
            'require_login_before_checkout' => ['boolean'],
        ];
    }
}
