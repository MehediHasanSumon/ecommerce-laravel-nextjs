<?php

namespace App\Support\Security;

final class UserAgentMetadata
{
    public static function from(?string $userAgent): array
    {
        $value = mb_substr(trim((string) $userAgent), 0, 2000);
        $lower = strtolower($value);

        $bot = preg_match('/bot|crawler|spider|slurp|headless|scrapy|curl|wget|python-requests|httpclient/i', $value) === 1;
        $device = $bot
            ? 'bot'
            : (preg_match('/ipad|tablet/i', $value) ? 'tablet' : (preg_match('/mobile|android|iphone/i', $value) ? 'mobile' : 'desktop'));

        $browser = match (true) {
            str_contains($lower, 'edg/') => 'Microsoft Edge',
            str_contains($lower, 'opr/') || str_contains($lower, 'opera') => 'Opera',
            str_contains($lower, 'firefox/') => 'Firefox',
            str_contains($lower, 'chrome/') || str_contains($lower, 'crios/') => 'Chrome',
            str_contains($lower, 'safari/') => 'Safari',
            $bot => 'Bot',
            default => 'Unknown',
        };

        $operatingSystem = match (true) {
            str_contains($lower, 'windows') => 'Windows',
            str_contains($lower, 'android') => 'Android',
            str_contains($lower, 'iphone') || str_contains($lower, 'ipad') || str_contains($lower, 'ios') => 'iOS',
            str_contains($lower, 'mac os') || str_contains($lower, 'macintosh') => 'macOS',
            str_contains($lower, 'linux') => 'Linux',
            default => 'Unknown',
        };

        return [
            'user_agent' => $value !== '' ? $value : null,
            'device_type' => $device,
            'browser' => $browser,
            'operating_system' => $operatingSystem,
            'is_bot' => $bot,
        ];
    }
}
