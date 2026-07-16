<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TrackOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'order_id' => strtoupper(trim((string) $this->input('order_id'))),
            'mobile_number' => trim((string) $this->input('mobile_number')),
        ]);
    }

    public function rules(): array
    {
        return [
            'order_id' => ['required', 'string', 'max:40', 'regex:/^ORD-[A-Z0-9-]{8,32}$/'],
            'mobile_number' => ['required', 'string', 'max:30', 'regex:/^\+?[0-9][0-9\s\-()]{7,24}$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'order_id.required' => 'Enter your Order ID.',
            'order_id.regex' => 'Enter a valid Order ID.',
            'mobile_number.required' => 'Enter the mobile number used for this order.',
            'mobile_number.regex' => 'Enter a valid mobile number.',
        ];
    }
}
