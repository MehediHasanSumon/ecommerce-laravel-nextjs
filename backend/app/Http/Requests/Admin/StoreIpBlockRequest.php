<?php

namespace App\Http\Requests\Admin;

use App\Support\Security\IpAddress;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIpBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('ip_address')) {
            $this->merge(['ip_address' => IpAddress::normalize($this->input('ip_address')) ?? $this->input('ip_address')]);
        }
    }

    public function rules(): array
    {
        return [
            'ip_address' => ['required', 'ip'],
            'reason' => ['required', 'string', 'max:80'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'type' => ['required', Rule::in(['manual', 'automatic'])],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
