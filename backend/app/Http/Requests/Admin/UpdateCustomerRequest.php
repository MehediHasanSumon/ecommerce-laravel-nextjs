<?php

namespace App\Http\Requests\Admin;

use App\Models\Customer;
use App\Support\CustomerPhoneNormalizer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('mobile')) {
            $this->merge([
                'mobile' => CustomerPhoneNormalizer::normalize($this->input('mobile')),
            ]);
        }
        if ($this->has('email') && is_string($this->input('email'))) {
            $email = trim($this->input('email'));
            $this->merge([
                'email' => $email !== '' ? mb_strtolower($email) : null,
            ]);
        }
        if ($this->has('name') && is_string($this->input('name'))) {
            $this->merge([
                'name' => trim($this->input('name')),
            ]);
        }
        if ($this->has('address') && is_string($this->input('address'))) {
            $this->merge([
                'address' => trim($this->input('address')),
            ]);
        }
    }

    public function rules(): array
    {
        $customer = $this->route('customer');
        $customerId = $customer instanceof Customer ? $customer->id : $customer;

        return [
            'name' => ['required', 'string', 'max:255'],
            'mobile' => [
                'required',
                'string',
                'min:6',
                'max:40',
                Rule::unique('customers', 'mobile')->ignore($customerId),
            ],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Customer name is required.',
            'mobile.required' => 'Customer mobile number is required.',
            'mobile.unique' => 'Another customer is already using this mobile number.',
            'email.email' => 'Please enter a valid email address.',
            'status.required' => 'Customer status is required.',
        ];
    }
}
