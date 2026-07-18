<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class HomePageCache
{
    private const VERSION_KEY = 'home-page:cache-version';

    public static function key(string $fingerprint): string
    {
        return 'home-page:v'.self::version().':'.$fingerprint;
    }

    public static function invalidate(): void
    {
        Cache::forever(self::VERSION_KEY, self::version() + 1);
    }

    public static function version(): int
    {
        return max(1, (int) Cache::get(self::VERSION_KEY, 1));
    }
}
