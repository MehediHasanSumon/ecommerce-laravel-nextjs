<?php

namespace App\Support\Security;

final class IpAddress
{
    public static function normalize(?string $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '' || str_contains($value, '%')) {
            return null;
        }

        if (str_starts_with($value, '[') && str_ends_with($value, ']')) {
            $value = substr($value, 1, -1);
        }

        if (filter_var($value, FILTER_VALIDATE_IP) === false) {
            return null;
        }

        $packed = @inet_pton($value);
        if ($packed === false) {
            return null;
        }

        if (strlen($packed) === 16 && substr($packed, 0, 12) === str_repeat("\0", 10)."\xff\xff") {
            return inet_ntop(substr($packed, 12)) ?: null;
        }

        $normalized = inet_ntop($packed);

        return $normalized === false ? null : strtolower($normalized);
    }

    public static function version(string $ip): int
    {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false ? 4 : 6;
    }

    public static function isLocal(string $ip): bool
    {
        $normalized = self::normalize($ip);
        if ($normalized === null) {
            return false;
        }

        if ($normalized === '::1') {
            return true;
        }

        return filter_var($normalized, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false
            && str_starts_with($normalized, '127.');
    }

    public static function normalizeNetwork(?string $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        [$ip, $prefix] = array_pad(explode('/', $value, 2), 2, null);
        $normalized = self::normalize($ip);
        if ($normalized === null) {
            return null;
        }

        $maximum = self::version($normalized) === 4 ? 32 : 128;
        if ($prefix === null || $prefix === '') {
            return $normalized.'/'.$maximum;
        }

        if (! ctype_digit($prefix) || (int) $prefix < 0 || (int) $prefix > $maximum) {
            return null;
        }

        return $normalized.'/'.(int) $prefix;
    }

    public static function inNetwork(string $ip, string $network): bool
    {
        $ip = self::normalize($ip);
        $network = self::normalizeNetwork($network);
        if ($ip === null || $network === null) {
            return false;
        }

        [$networkIp, $prefix] = explode('/', $network, 2);
        if (self::version($ip) !== self::version($networkIp)) {
            return false;
        }

        $address = inet_pton($ip);
        $base = inet_pton($networkIp);
        if ($address === false || $base === false) {
            return false;
        }

        $bits = (int) $prefix;
        $bytes = intdiv($bits, 8);
        $remaining = $bits % 8;

        if ($bytes > 0 && substr($address, 0, $bytes) !== substr($base, 0, $bytes)) {
            return false;
        }

        if ($remaining === 0) {
            return true;
        }

        $mask = (0xFF << (8 - $remaining)) & 0xFF;

        return (ord($address[$bytes]) & $mask) === (ord($base[$bytes]) & $mask);
    }

    public static function inAnyNetwork(string $ip, array $networks): bool
    {
        foreach ($networks as $network) {
            if (is_string($network) && self::inNetwork($ip, $network)) {
                return true;
            }
        }

        return false;
    }

    public static function cacheKey(string $ip): string
    {
        return hash('sha256', self::normalize($ip) ?? $ip);
    }
}
