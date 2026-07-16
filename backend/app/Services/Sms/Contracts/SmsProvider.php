<?php

namespace App\Services\Sms\Contracts;

use App\Models\Settings\SmsSetting;

interface SmsProvider
{
    public function send(SmsSetting $settings, string $recipient, string $message): array;
}
