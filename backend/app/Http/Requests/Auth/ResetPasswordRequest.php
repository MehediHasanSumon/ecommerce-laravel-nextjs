<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => is_string($this->email) ? mb_strtolower(trim($this->email)) : $this->email,
            'token' => is_string($this->token) ? trim($this->token) : $this->token,
        ]);
    }

    public function rules(): array
    {
        return [
            'email' => ['bail', 'required', 'string', 'email:rfc', 'max:254'],
            'token' => ['bail', 'required', 'string', 'max:512'],
            'password' => ['bail', 'required', 'string', 'confirmed', Password::min(6)],
        ];
    }

    public function messages(): array
    {
        return [
            'password.confirmed' => 'The password confirmation does not match.',
        ];
    }
}
