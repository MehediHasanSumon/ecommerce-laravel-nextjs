<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $input = $this->input('email') ?? $this->input('phone') ?? $this->input('identifier') ?? $this->input('login');

        $this->merge([
            'email' => is_string($input) ? trim($input) : $input,
        ]);
    }

    public function rules(): array
    {
        return [
            'email' => ['bail', 'required', 'string', 'max:254'],
            'password' => ['bail', 'required', 'string', 'max:1024'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Email or phone number is required.',
        ];
    }
}
