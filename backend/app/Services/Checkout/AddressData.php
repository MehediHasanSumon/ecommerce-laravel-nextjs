<?php

namespace App\Services\Checkout;

class AddressData
{
    public static function normalize(array $data): array
    {
        $normalized = [
            'full_name' => self::clean($data['full_name'] ?? $data['fullName'] ?? ''),
            'phone' => self::clean($data['phone'] ?? ''),
            'alternative_phone' => self::nullableClean($data['alternative_phone'] ?? $data['alternativePhone'] ?? null),
            'email' => self::nullableClean($data['email'] ?? null),
            'country' => self::clean($data['country'] ?? 'Bangladesh'),
            'state' => self::clean($data['state'] ?? $data['division'] ?? ''),
            'district' => self::clean($data['district'] ?? ''),
            'city' => self::clean($data['city'] ?? $data['upazila'] ?? $data['thana'] ?? ''),
            'area' => self::nullableClean($data['area'] ?? $data['union'] ?? null),
            'postal_code' => self::nullableClean($data['postal_code'] ?? $data['postalCode'] ?? $data['postCode'] ?? null),
            'address_line' => self::clean($data['address_line'] ?? $data['addressLine'] ?? $data['address'] ?? ''),
            'landmark' => self::nullableClean($data['landmark'] ?? null),
            'address_label' => self::nullableClean($data['address_label'] ?? $data['addressLabel'] ?? null),
            'is_default_billing' => (bool) ($data['is_default_billing'] ?? $data['isDefaultBilling'] ?? false),
            'is_default_shipping' => (bool) ($data['is_default_shipping'] ?? $data['isDefaultShipping'] ?? false),
        ];

        $normalized['duplicate_fingerprint'] = self::fingerprint($normalized);

        return $normalized;
    }

    public static function fingerprint(array $data): string
    {
        $parts = [
            $data['full_name'] ?? '',
            $data['phone'] ?? '',
            $data['state'] ?? '',
            $data['district'] ?? '',
            $data['city'] ?? '',
            $data['postal_code'] ?? '',
            $data['address_line'] ?? '',
        ];

        return hash('sha256', implode('|', array_map(fn ($value) => self::key((string) $value), $parts)));
    }

    public static function snapshot(array $data): array
    {
        return [
            'full_name' => $data['full_name'] ?? '',
            'phone' => $data['phone'] ?? '',
            'alternative_phone' => $data['alternative_phone'] ?? null,
            'email' => $data['email'] ?? null,
            'country' => $data['country'] ?? '',
            'state' => $data['state'] ?? '',
            'district' => $data['district'] ?? '',
            'city' => $data['city'] ?? '',
            'area' => $data['area'] ?? null,
            'postal_code' => $data['postal_code'] ?? null,
            'address_line' => $data['address_line'] ?? '',
            'landmark' => $data['landmark'] ?? null,
            'address_label' => $data['address_label'] ?? null,
        ];
    }

    private static function clean(mixed $value): string
    {
        return trim((string) preg_replace('/\s+/', ' ', (string) $value));
    }

    private static function nullableClean(mixed $value): ?string
    {
        $clean = self::clean($value ?? '');

        return $clean === '' ? null : $clean;
    }

    private static function key(string $value): string
    {
        return mb_strtolower(preg_replace('/\s+/', ' ', trim($value)));
    }
}
