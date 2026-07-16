<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class VerifyCheckoutOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'challenge_id' => ['required', 'uuid'],
            'mobile' => ['required', 'string', 'max:40', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
            'code' => ['required', 'digits_between:4,8'],
        ];
    }
}
