<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => is_string($this->name) ? trim(strip_tags($this->name)) : $this->name,
            'email' => is_string($this->email) ? mb_strtolower(trim($this->email)) : $this->email,
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => ['bail', 'required', 'string', 'min:2', 'max:120', 'regex:/^[\pL\pM\pN\s.\'-]+$/u'],
            'email' => ['bail', 'required', 'string', 'email:rfc', 'max:254', 'unique:users,email'],
            'password' => ['bail', 'required', 'string', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],
        ];
    }

    public function messages(): array
    {
        return [
            'name.regex' => 'The name may only contain letters, numbers, spaces, apostrophes, hyphens, and periods.',
            'password.confirmed' => 'The password confirmation does not match.',
        ];
    }
}
