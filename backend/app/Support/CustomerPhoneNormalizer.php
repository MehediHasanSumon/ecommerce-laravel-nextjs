<?php

namespace App\Support;

class CustomerPhoneNormalizer
{
    public static function normalize(?string $phone): string
    {
        if (! $phone) {
            return '';
        }

        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        // If Bangladeshi number with 880 prefix (e.g. 88017XXXXXXXX), convert to 017XXXXXXXX
        if (str_starts_with($digits, '8801') && strlen($digits) === 13) {
            return '0'.substr($digits, 3);
        }

        // If local 10 digits starting with 1 (e.g. 17XXXXXXXX), add leading 0
        if (str_starts_with($digits, '1') && strlen($digits) === 10) {
            return '0'.$digits;
        }

        return $digits;
    }
}
