<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendCheckoutOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'mobile' => ['required', 'string', 'max:40', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
        ];
    }

    public function messages(): array
    {
        return ['mobile.regex' => 'Enter a valid Bangladeshi mobile number.'];
    }
}
