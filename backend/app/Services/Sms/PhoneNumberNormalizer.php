<?php

namespace App\Services\Sms;

use App\Models\Settings\SmsSetting;

class PhoneNumberNormalizer
{
    public function normalize(string $phone, ?SmsSetting $settings = null): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?: '';
        $countryCode = preg_replace('/\D+/', '', (string) ($settings?->default_country_code ?: '880')) ?: '880';

        if (str_starts_with($digits, $countryCode)) {
            return '+'.$digits;
        }
        if (str_starts_with($digits, '0')) {
            return '+'.$countryCode.substr($digits, 1);
        }

        return '+'.$digits;
    }
}
