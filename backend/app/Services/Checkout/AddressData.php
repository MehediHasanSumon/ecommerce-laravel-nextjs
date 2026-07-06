<?php

namespace App\Services\Checkout;

class AddressData
{
    public static function normalize(array $data): array
    {
        return [
            'label' => (string) ($data['label'] ?? 'Home'),
            'full_name' => (string) ($data['full_name'] ?? $data['fullName'] ?? ''),
            'phone' => (string) ($data['phone'] ?? ''),
            'email' => $data['email'] ?? null,
            'country' => (string) ($data['country'] ?? ''),
            'state' => (string) ($data['state'] ?? ''),
            'district' => (string) ($data['district'] ?? $data['city'] ?? ''),
            'city' => (string) ($data['city'] ?? ''),
            'area' => $data['area'] ?? null,
            'postal_code' => $data['postal_code'] ?? $data['postalCode'] ?? null,
            'address_line' => (string) ($data['address_line'] ?? $data['addressLine'] ?? $data['address'] ?? ''),
            'is_default_billing' => (bool) ($data['is_default_billing'] ?? $data['isDefaultBilling'] ?? false),
            'is_default_shipping' => (bool) ($data['is_default_shipping'] ?? $data['isDefaultShipping'] ?? false),
        ];
    }
}
