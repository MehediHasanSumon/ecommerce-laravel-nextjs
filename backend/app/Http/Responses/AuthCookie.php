<?php

namespace App\Http\Responses;

use Symfony\Component\HttpFoundation\Cookie;

class AuthCookie
{
    public static function access(string $token): Cookie
    {
        return self::make(config('auth_api.access_cookie_name'), $token, config('auth_api.access_token_expiration_minutes'));
    }

    public static function forgetAccess(): Cookie
    {
        return cookie()->forget(config('auth_api.access_cookie_name'));
    }

    private static function make(string $name, string $value, int $minutes): Cookie
    {
        return cookie(
            name: $name,
            value: $value,
            minutes: $minutes,
            path: '/',
            domain: config('session.domain'),
            secure: (bool) config('session.secure'),
            httpOnly: true,
            raw: false,
            sameSite: config('session.same_site', 'lax')
        );
    }
}
